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

use crate::node::operation::LogId;

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(tag = "t", content = "c", rename_all = "snake_case")]
pub enum NetworkTopic {
    InviteCodes,
    Calendar { calendar_id: Hash },
}

impl TopicQuery for NetworkTopic {}

impl TopicId for NetworkTopic {
    fn id(&self) -> [u8; 32] {
        match self {
            NetworkTopic::InviteCodes => Hash::new(b"invite-codes").into(),
            NetworkTopic::Calendar { calendar_id } => {
                Hash::new(format!("data-{calendar_id}").as_bytes()).into()
            }
        }
    }
}

#[derive(Clone, Debug)]
pub struct TopicMap {
    inner: InnerTopicMap,
}

#[derive(Clone, Debug)]
struct InnerTopicMap {
    authors: Arc<RwLock<HashMap<Hash, Vec<PublicKey>>>>,
}

impl TopicMap {
    pub fn new() -> Self {
        Self {
            inner: InnerTopicMap {
                authors: Arc::new(RwLock::new(HashMap::new())),
            },
        }
    }

    pub async fn add_author(&self, public_key: PublicKey, calendar_id: Hash) {
        let mut authors = self.inner.authors.write().await;
        authors
            .entry(calendar_id)
            .and_modify(|public_keys| public_keys.push(public_key))
            .or_insert(vec![public_key]);
    }
}

#[async_trait]
impl TopicLogMap<NetworkTopic, LogId> for TopicMap {
    async fn get(&self, topic: &NetworkTopic) -> Option<HashMap<PublicKey, Vec<LogId>>> {
        match topic {
            // We don't want to sync over invite codes.
            NetworkTopic::InviteCodes => None,
            NetworkTopic::Calendar { calendar_id } => {
                let authors = self.inner.authors.read().await;
                authors.get(calendar_id).map(|public_keys| {
                    let mut result = HashMap::with_capacity(public_keys.len());
                    for public_key in public_keys {
                        result.insert(
                            public_key.to_owned(),
                            // @NOTE(adz): Currently we store everything in one log per calendar,
                            // later we want to list all possible "log types" here, for example for
                            // all events, resources, messages etc.
                            vec![LogId {
                                calendar_id: *calendar_id,
                            }],
                        );
                    }
                    result
                })
            }
        }
    }
}
