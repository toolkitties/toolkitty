use std::collections::HashMap;

use anyhow::{anyhow, Result};
use futures_util::stream::SelectAll;
use p2panda_core::{cbor::decode_cbor, Body, Header};
use p2panda_net::{FromNetwork, Network, ToNetwork, TopicId};
use p2panda_sync::TopicQuery;
use tokio::sync::{mpsc, oneshot};
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;
use tracing::{error, trace, warn};

use crate::node::extensions::Extensions;
use crate::node::operation::decode_gossip_message;
pub enum ToNodeActor<T> {
    SubscribeProcessed {
        topic: T,
    },
    Subscribe {
        topic: T,
    },
    Broadcast {
        topic_id: [u8; 32],
        bytes: Vec<u8>,
    },
    #[allow(dead_code)]
    Shutdown {
        reply: oneshot::Sender<()>,
    },
}

pub struct NodeActor<T> {
    network: Network<T>,
    inbox: mpsc::Receiver<ToNodeActor<T>>,
    topic_rx: SelectAll<ReceiverStream<FromNetwork>>,
    topic_tx: HashMap<[u8; 32], mpsc::Sender<ToNetwork>>,
    stream_processor_tx: mpsc::Sender<(Header<Extensions>, Option<Body>, Vec<u8>)>,
    ephemeral_tx: mpsc::Sender<Vec<u8>>,
}

impl<T: TopicId + TopicQuery + 'static> NodeActor<T> {
    pub fn new(
        network: Network<T>,
        stream_processor_tx: mpsc::Sender<(Header<Extensions>, Option<Body>, Vec<u8>)>,
        ephemeral_tx: mpsc::Sender<Vec<u8>>,
        inbox: mpsc::Receiver<ToNodeActor<T>>,
    ) -> Self {
        Self {
            network,
            inbox,
            topic_rx: SelectAll::new(),
            topic_tx: HashMap::new(),
            stream_processor_tx,
            ephemeral_tx,
        }
    }

    pub async fn run(mut self) -> Result<()> {
        // Take oneshot sender from external API awaited by `shutdown` call and fire it as soon as
        // shutdown completed to signal.
        let shutdown_completed_signal = self.run_inner().await;

        if let Err(err) = self.shutdown().await {
            error!(?err, "error during shutdown");
        }

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
            ToNodeActor::SubscribeProcessed { topic } => {
                let topic_id = topic.id();
                let (topic_tx, topic_rx, _ready) = self.network.subscribe(topic).await?;
                self.topic_tx.insert(topic_id, topic_tx);
                self.topic_rx.push(ReceiverStream::new(topic_rx));
            }
            ToNodeActor::Subscribe { topic } => {
                let topic_id = topic.id();
                let (topic_tx, topic_rx, _ready) = self.network.subscribe(topic).await?;
                self.topic_tx.insert(topic_id, topic_tx.clone());
                self.topic_rx.push(ReceiverStream::new(topic_rx));
            }
            ToNodeActor::Broadcast { topic_id, bytes } => match self.topic_tx.get(&topic_id) {
                Some(tx) => {
                    if let Err(_err) = tx.send(ToNetwork::Message { bytes }).await {
                        // @TODO: Handle error
                    }
                }
                None => {
                    // @TODO: Can we ignore this?
                }
            },
            ToNodeActor::Shutdown { .. } => {
                unreachable!("handled in run_inner");
            }
        }

        Ok(())
    }

    async fn on_network_event(&mut self, event: FromNetwork) -> Result<()> {
        let (header_bytes, body_bytes) = match event {
            FromNetwork::GossipMessage { bytes, .. } => {
                trace!(
                    source = "gossip",
                    bytes = bytes.len(),
                    "received network message"
                );
                match decode_gossip_message(&bytes) {
                    Ok(result) => result,
                    Err(_err) => {
                        // @TODO(sam): If decoding into (header, body) tuple we assume this is an ephemeral
                        // "non-p2panda" message. We need to think of a better solution here. The issue is
                        // that the node actor can't distinguish between messages arriving from the
                        // network which are p2panda or not....
                        self.ephemeral_tx.send(bytes).await?;
                        return Ok(());
                    }
                }
            }
            FromNetwork::SyncMessage {
                header: header_bytes,
                payload: body_bytes,
                ..
            } => {
                trace!(
                    source = "sync",
                    bytes = header_bytes.len() + body_bytes.as_ref().map_or(0, |b| b.len()),
                    "received network message"
                );
                (header_bytes, body_bytes)
            }
        };

        let header = match decode_cbor(&header_bytes[..]) {
            Ok(header) => header,
            Err(err) => {
                warn!("failed decoding operation header: {err}");
                return Ok(());
            }
        };

        let body = body_bytes.map(Body::from);
        self.stream_processor_tx
            .send((header, body, header_bytes))
            .await?;

        Ok(())
    }

    // @TODO: Send shutdown command.
    async fn shutdown(self) -> Result<()> {
        self.network.shutdown().await?;
        Ok(())
    }
}
