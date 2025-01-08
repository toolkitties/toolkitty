use anyhow::{anyhow, Result};
use futures_util::stream::SelectAll;
use p2panda_net::{FromNetwork, Network, ToNetwork, TopicId};
use p2panda_sync::TopicQuery;
use tokio::sync::{mpsc, oneshot};
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;
use tracing::{error, trace};

use crate::node::operation::decode_gossip_message;

pub enum ToNodeActor<T> {
    Subscribe {
        topic: T,
        reply: oneshot::Sender<(mpsc::Sender<ToNetwork>, oneshot::Receiver<()>)>,
    },
    Shutdown {
        reply: oneshot::Sender<()>,
    },
}

pub struct NodeActor<T> {
    network: Network<T>,
    inbox: mpsc::Receiver<ToNodeActor<T>>,
    topic_rx: SelectAll<ReceiverStream<FromNetwork>>,
    stream_processor_tx: mpsc::Sender<(Vec<u8>, Option<Vec<u8>>)>,
}

impl<T: TopicId + TopicQuery + 'static> NodeActor<T> {
    pub fn new(
        network: Network<T>,
        stream_processor_tx: mpsc::Sender<(Vec<u8>, Option<Vec<u8>>)>,
        inbox: mpsc::Receiver<ToNodeActor<T>>,
    ) -> Self {
        Self {
            network,
            inbox,
            topic_rx: SelectAll::new(),
            stream_processor_tx,
        }
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
                Some(event) = self.topic_rx.next() => {
                    self.on_network_event(event).await?;
                },
                else => {
                    // Error occurred outside of actor and our select! loop got disabled. We exit
                    // here with an error which will probably be overriden by the external error
                    // which caused the problem in first hand.
                    break Err(anyhow!("all select! branches are disabled"));
                }
            }
        }
    }

    async fn on_actor_message(&mut self, msg: ToNodeActor<T>) -> Result<()> {
        match msg {
            ToNodeActor::Subscribe { topic, reply } => {
                let (topic_tx, topic_rx, ready) = self.network.subscribe(topic).await?;
                self.topic_rx.push(ReceiverStream::new(topic_rx));
                reply.send((topic_tx, ready)).ok();
            }
            ToNodeActor::Shutdown { .. } => {
                unreachable!("handled in run_inner");
            }
        }

        Ok(())
    }

    async fn on_network_event(&mut self, event: FromNetwork) -> Result<()> {
        let (header, payload, delivered_from, is_gossip) = match event {
            FromNetwork::GossipMessage {
                bytes,
                delivered_from,
            } => {
                trace!(
                    source = "gossip",
                    bytes = bytes.len(),
                    "received network message"
                );
                let (header, payload) = decode_gossip_message(&bytes)?;
                (bytes, payload, delivered_from, true)
            }
            FromNetwork::SyncMessage {
                header,
                payload,
                delivered_from,
            } => {
                trace!(
                    source = "sync",
                    bytes = header.len(),
                    "received network message"
                );
                (header, payload, delivered_from, false)
            }
        };

        self.stream_processor_tx.send((header, payload)).await?;
        Ok(())
    }

    async fn shutdown(&self) -> Result<()> {
        self.network.clone().shutdown().await?;
        Ok(())
    }
}
