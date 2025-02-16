use std::hash::Hash as StdHash;
use std::sync::Arc;
use std::{collections::HashMap, fmt::Display};

use async_trait::async_trait;
use p2panda_core::{Hash, PublicKey};
use p2panda_net::TopicId;
use p2panda_sync::log_sync::TopicLogMap;
use p2panda_sync::TopicQuery;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::node::extensions::{CalendarId, LogId};

const INVITE_CODES_TOPIC_ID: &str = "invite-codes";
const DATA_TOPIC_ID_PREFIX: &str = "data";
const INBOX_TOPIC_ID_PREFIX: &str = "inbox";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TopicType {
    Inbox,
    Data,
}

impl Display for TopicType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let topic_type = match self {
            TopicType::Inbox => "inbox",
            TopicType::Data => "data",
        };
        write!(f, "{topic_type}")
    }
}

#[derive(Clone, Debug, PartialEq, Eq, StdHash, Serialize, Deserialize)]
#[serde(tag = "t", content = "c", rename_all = "snake_case")]
pub enum NetworkTopic {
    InviteCodes,
    CalendarInbox { calendar_id: CalendarId },
    CalendarData { calendar_id: CalendarId },
}

impl TopicQuery for NetworkTopic {}

impl TopicId for NetworkTopic {
    fn id(&self) -> [u8; 32] {
        match self {
            NetworkTopic::InviteCodes => Hash::new(INVITE_CODES_TOPIC_ID.as_bytes()).into(),
            NetworkTopic::CalendarInbox { calendar_id } => {
                Hash::new(format!("{INBOX_TOPIC_ID_PREFIX}-{calendar_id}").as_bytes()).into()
            }
            NetworkTopic::CalendarData { calendar_id } => {
                Hash::new(format!("{DATA_TOPIC_ID_PREFIX}-{calendar_id}").as_bytes()).into()
            }
        }
    }
}

#[derive(Clone, Debug)]
pub struct TopicMap {
    inner: Arc<RwLock<InnerTopicMap>>,
}

#[derive(Clone, Debug)]
struct InnerTopicMap {
    topics: HashMap<NetworkTopic, AuthorLogs>,
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

    pub async fn add_log(&self, topic: NetworkTopic, public_key: PublicKey, log_id: LogId) {
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
impl TopicLogMap<NetworkTopic, LogId> for TopicMap {
    async fn get(&self, topic: &NetworkTopic) -> Option<HashMap<PublicKey, Vec<LogId>>> {
        let lock = self.inner.read().await;
        lock.topics.get(&topic).cloned()
    }
}
