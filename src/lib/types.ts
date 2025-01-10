type OperationMeta = {
  logId: {
    calendarId: string;
  };
  operationId: string;
  publicKey: string;
};

type StreamMessage =
  | {
      meta: OperationMeta;
      event: "application";
      data: ApplicationMessage;
    }
  | {
      meta: OperationMeta;
      event: "error";
      data: string;
    };

type InviteCodeReadyMessage = {
  event: "invite_code_ready";
};

type InviteCodeMessage = {
  event: "invite_code";
  data: ResolveInviteCodeRequest | ResolveInviteCodeResponse;
};

type ChannelMessage =
  | StreamMessage
  | InviteCodeReadyMessage
  | InviteCodeMessage;

type ApplicationMessage = {
  type: "EventCreated";
  data: {
    title: string;
  };
};

type ResolveInviteCodeRequest = {
  inviteCode: string;
  timestamp: number;
  messageType: "request";
};

type ResolveInviteCodeResponse = {
  calendarId: string;
  inviteCode: string;
  timestamp: number;
  messageType: "response";
};
