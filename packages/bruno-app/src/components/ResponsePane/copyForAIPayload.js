export const buildSelectedRequestForResponseActions = ({ item, collection }) => ({
  itemUid: item.uid,
  collectionUid: collection.uid,
  timestamp: item.timestamp,
  data: {
    request: item.request,
    response: item.response || {}
  }
});
