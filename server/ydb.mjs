export const createYdbStore = ({ endpoint, token, table = 'orienta', transport = fetch }) => {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.hostname !== 'docapi.serverless.yandexcloud.net' || !url.pathname.startsWith('/ru-central1/')) throw new Error('Expected a YDB Document API endpoint in Russia');
  const call = async (action, input) => {
    const response = await transport(url, { method: 'POST', signal: AbortSignal.timeout(8000), headers: { authorization: 'Bearer ' + await token(), 'content-type': 'application/x-amz-json-1.0', 'x-amz-target': 'DynamoDB_20120810.' + action }, body: JSON.stringify({ TableName: table, ...input }) });
    const result = await response.json();
    if (!response.ok) { const error = new Error('YDB request failed'); error.conditional = /ConditionalCheckFailedException/.test(result.__type || ''); throw error; }
    return result;
  };
  const decode = item => item ? { key: item.key.S, revision: Number(item.revision.N), value: JSON.parse(item.value.S) } : null;
  return {
    get: async key => decode((await call('GetItem', { Key: { key: { S: key } }, ConsistentRead: true })).Item),
    compareAndSet: async (key, expected, value) => {
      try {
        await call('PutItem', { Item: { key: { S: key }, revision: { N: String(expected + 1) }, value: { S: JSON.stringify(value) } },
          ConditionExpression: expected === 0 ? 'attribute_not_exists(#key)' : '#revision = :expected',
          ExpressionAttributeNames: expected === 0 ? { '#key': 'key' } : { '#revision': 'revision' },
          ...(expected === 0 ? {} : { ExpressionAttributeValues: { ':expected': { N: String(expected) } } }) });
        return true;
      } catch (error) { if (error.conditional) return false; throw error; }
    },
    scan: async prefix => {
      const all = []; let next;
      do { const page = await call('Scan', { FilterExpression: 'begins_with(#key, :prefix)', ExpressionAttributeNames: { '#key': 'key' }, ExpressionAttributeValues: { ':prefix': { S: prefix } }, ...(next ? { ExclusiveStartKey: next } : {}) }); all.push(...(page.Items || []).map(decode)); next = page.LastEvaluatedKey; } while (next && Object.keys(next).length);
      return all;
    },
  };
};
