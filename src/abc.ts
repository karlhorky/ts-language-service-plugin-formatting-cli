class Sample {
  hello(word = 'world') {
    return 'Hello, ' + word;
  }
}
new Sample().hello('TypeScript');

function sql(...args) {}

export default function query() {
  return sql`SELECT  *
  FROM                               products`;
}
