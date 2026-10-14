// Mentions event, trigger, listener, redis and stripe only in prose: not a pipeline hop.
export const formatEvent = (event) => `${event.type} trigger listener`;
