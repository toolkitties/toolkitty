use std::collections::HashMap;
use std::hash::Hash as StdHash;
use std::sync::Arc;

use async_trait::async_trait;
use p2panda_core::{Hash, PublicKey};
use p2panda_net::TopicId;
use p2panda_sync::log_sync::TopicLogMap;
use p2panda_sync::TopicQuery;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::node::extensions::LogId;

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub struct Topic(String);

impl From<&str> for Topic {
    fn from(value: &str) -> Self {
        Topic(value.to_string())
    }
}

impl From<String> for Topic {
    fn from(value: String) -> Self {
        Topic(value)
    }
}

impl TopicQuery for Topic {}

impl TopicId for Topic {
    fn id(&self) -> [u8; 32] {
        Hash::new(self.0.as_bytes()).as_bytes().clone()
    }
}

#[derive(Clone, Debug)]
pub struct TopicMap {
    inner: Arc<RwLock<InnerTopicMap>>,
}

#[derive(Clone, Debug)]
struct InnerTopicMap {
    topics: HashMap<Topic, AuthorLogs>,
}

type AuthorLogs = HashMap<PublicKey, Vec<LogId>>;

impl TopicMap {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(InnerTopicMap {
                topics: HashMap::new(),
            })),
        }
    }

    pub async fn add_log(&self, topic: Topic, public_key: PublicKey, log_id: LogId) {
        let mut lock = self.inner.write().await;
        lock.topics
            .entry(topic)
            .and_modify(|author_logs| {
                author_logs
                    .entry(public_key)
                    .and_modify(|logs| {
                        logs.push(log_id.clone());
                    })
                    .or_insert(vec![log_id.clone()]);
            })
            .or_insert(HashMap::from([(public_key, vec![log_id])]));
    }
}

#[async_trait]
impl TopicLogMap<Topic, LogId> for TopicMap {
    async fn get(&self, topic: &Topic) -> Option<HashMap<PublicKey, Vec<LogId>>> {
        let lock = self.inner.read().await;
        lock.topics.get(&topic).cloned()
    }
}
