Proof of concept for a command-line formatter with a TypeScript Language Service Plugin, based on TypeScript Server's `tsserverlibrary`.

This POC includes formatting SQL queries in tagged template literals using [`frigus02/typescript-sql-tagged-template-plugin`](https://github.com/frigus02/typescript-sql-tagged-template-plugin), as in the code from [`src/abc.ts`](https://github.com/karlhorky/ts-language-service-plugin-formatting-cli/blob/main/src/abc.ts) below:

```ts
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
```

Credits to:

- https://gist.github.com/weswigham/f477373b6124cc43df5356c75f66911b
- https://github.com/vvakame/typescript-formatter/blob/master/lib/formatter.ts#L5-L37
- `@ts-morph/bootstrap`
  - https://github.com/dsherret/ts-morph/issues/326
  - https://github.com/dsherret/ts-morph/issues/781
- https://stackoverflow.com/questions/50730406/instantiate-typescript-languageservice-w-plugins-via-api
