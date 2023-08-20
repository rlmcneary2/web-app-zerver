# web-tserver

This is a server that will accept requests for TypeScript files with a path that
ends with a "ts" file extension. The TypeScript file resource will be transpiled
to JavaScript and returned with the mime-type `text/javascript`.

## Requires

- Deno version 1.36.1 or later.
- Node Hydrogen/LTS or later.

## Install

```sh
npm install
```

## Run

```sh
npm run start
```

Open a browser and navigate to `http://<machine IP>:3000/`.

## Development

Currently served file extensions.

| Extension | Response Mime-Type |
| --------- | ------------------ |
| html      | text/html          |
| ico       | image/x-icon       |
| ts        | text/javascript    |
