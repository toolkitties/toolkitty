use anyhow::Result;
use p2panda_net::{Network, TopicId};
use p2panda_sync::TopicQuery;
use tokio::sync::{mpsc, oneshot};

pub enum ToNodeActor {
    Publish { reply: oneshot::Sender<Result<()>> },
    Subscribe { reply: oneshot::Sender<Result<()>> },
    Shutdown { reply: oneshot::Sender<()> },
}

pub struct NodeActor<T> {
    network: Network<T>,
    inbox: mpsc::Receiver<ToNodeActor>,
}

impl<T: TopicId + TopicQuery> NodeActor<T> {
    pub fn new(network: Network<T>, inbox: mpsc::Receiver<ToNodeActor>) -> Self {
        Self { network, inbox }
    }
}
