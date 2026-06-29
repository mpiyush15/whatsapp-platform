const finalSample = 'https://s3.amazonaws.com/test';
const isHandle = !finalSample.startsWith('http');
const example = isHandle ? { header_handle: [finalSample] } : { header_url: [finalSample] };
console.log(example);
