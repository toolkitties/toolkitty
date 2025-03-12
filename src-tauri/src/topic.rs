use std::hash::Hash as StdHash;
use std::sync::Arc;
use std::{collections::HashMap, fmt::Display};

use async_trait::async_trait;
use p2panda_core::{cbor, Hash, PublicKey};
use p2panda_net::TopicId;
use p2panda_sync::log_sync::TopicLogMap;
use p2panda_sync::TopicQuery;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::node::extensions::LogId;

/// There are two topic variants, ephemeral and processed. Messages sent on "ephemeral" topics are
/// gossiped between peers live but no sync of past messages occurs as nothing is persisted on the
/// node. Messages sent on "persisted" topics are persisted on the node in p2panda logs, and peers
/// periodically sync logs of topics they are interested in so that they eventually arrive at the
/// same state. Additionally "persisted" messages pass through the whole p2panda stream pipeline.
#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
pub enum Topic {
    Ephemeral(String),
    Persisted(String),
}

impl Display for Topic {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Topic::Ephemeral(topic) => write!(f, "ephemeral/{}", topic),
            Topic::Persisted(topic) => write!(f, "persisted/{}", topic),
        }
    }
}

impl TopicQuery for Topic {}

impl TopicId for Topic {
    fn id(&self) -> [u8; 32] {
        let bytes = cbor::encode_cbor(&self).unwrap();
        *Hash::new(bytes).as_bytes()
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

    pub async fn add_log(&self, topic: &Topic, public_key: &PublicKey, log_id: &LogId) {
        {
            let mut lock = self.inner.write().await;
            lock.topics
                .entry(topic.clone())
                .and_modify(|author_logs| {
                    author_logs
                        .entry(*public_key)
                        .and_modify(|logs| {
                            if !logs.contains(log_id) {
                                logs.push(log_id.clone());
                            }
                        })
                        .or_insert(vec![log_id.clone()]);
                })
                .or_insert(HashMap::from([(*public_key, vec![log_id.clone()])]));
        }
    }
}

#[async_trait]
impl TopicLogMap<Topic, LogId> for TopicMap {
    async fn get(&self, topic: &Topic) -> Option<HashMap<PublicKey, Vec<LogId>>> {
        // We don't actually want to sync ephemeral topics so just return an empty hash map here.
        if let Topic::Ephemeral(_) = topic {
            return Some(HashMap::default());
        }

        // For persisted topics we get all logs for that topic.
        let lock = self.inner.read().await;
        return lock.topics.get(topic).cloned();
    }
}
