use anyhow::{anyhow, Result};
use p2panda_net::{Network, TopicId};
use p2panda_sync::TopicQuery;
use tokio::sync::{mpsc, oneshot};
use tracing::error;

pub enum ToNodeActor {
    Publish { reply: oneshot::Sender<Result<()>> },
    Subscribe { reply: oneshot::Sender<Result<()>> },
    Shutdown { reply: oneshot::Sender<()> },
}

pub struct NodeActor<T> {
    network: Network<T>,
    inbox: mpsc::Receiver<ToNodeActor>,
}

impl<T: TopicId + TopicQuery + 'static> NodeActor<T> {
    pub fn new(network: Network<T>, inbox: mpsc::Receiver<ToNodeActor>) -> Self {
        Self { network, inbox }
    }

    pub async fn run(mut self) -> Result<()> {
        // Take oneshot sender from external API awaited by `shutdown` call and fire it as soon as
        // shutdown completed to signal.
        let shutdown_completed_signal = self.run_inner().await;
        if let Err(err) = self.shutdown().await {
            error!(?err, "error during shutdown");
        }

        drop(self);

        match shutdown_completed_signal {
            Ok(reply_tx) => {
                reply_tx.send(()).ok();
                Ok(())
            }
            Err(err) => Err(err),
        }
    }

    async fn run_inner(&mut self) -> Result<oneshot::Sender<()>> {
        loop {
            tokio::select! {
                biased;
                Some(msg) = self.inbox.recv() => {
                    match msg {
                        ToNodeActor::Shutdown { reply } => {
                            break Ok(reply);
                        }
                        msg => {
                            if let Err(err) = self.on_actor_message(msg).await {
                                break Err(err);
                            }
                        }
                    }
                },
                // Some(event) = self.p2panda_topic_rx.next() => {
                //     self.on_network_event(event).await?;
                // },
                else => {
                    // Error occurred outside of actor and our select! loop got disabled. We exit
                    // here with an error which will probably be overriden by the external error
                    // which caused the problem in first hand.
                    break Err(anyhow!("all select! branches are disabled"));
                }
            }
        }
    }
    async fn on_actor_message(&mut self, msg: ToNodeActor) -> Result<()> {
        match msg {
            ToNodeActor::Publish { reply } => {
                todo!()
            }
            ToNodeActor::Subscribe { reply } => {
                todo!()
            }
            ToNodeActor::Shutdown { .. } => {
                unreachable!("handled in run_inner");
            }
        }

        Ok(())
    }

    async fn shutdown(&self) -> Result<()> {
        self.network.clone().shutdown().await?;
        Ok(())
    }
}
