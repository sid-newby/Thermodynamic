Runtime Test Cases For AI Agents
To help developers validate whether WebContainer is right for their use case, we've compiled a suite of test cases that you can independently run on any runtime of your choosing (serverless, VMs, WebContainers, etc). 

Evaluating in-browser versus server runtimes
When building AI agents you often need to execute arbitrary code. The most ideal place to do this tends to be inside the user's browser tab, as it is secure, long lived, scales infinitely, is cost effective, and boots instantly which provides an extremely fast user experience.

While creating a simple in-browser proof-of-concept is straightforward, compatibility is usually the main issue with in-browser runtimes, and this is especially the case for AI agents where you need to execute the arbitrary code LLMs produce.

Inversely, using servers (whether VMs or serverless solutions) often provide compatibility guarantees but at the expense of being short lived, expensive to scale, difficult to secure, and suffering from increased latency and cold starts.

WebContainers is the first technology that has merged the best of both these worlds by bringing the entire Node.js runtime, ecosystem and tooling into the browser with excellent compatibility 

Test Cases and Examples
The following test cases cover a broad spectrum of essential tools and frameworks in web development, ensuring AI agents are versatile, efficient, and capable of handling real-world coding tasks. These tools, frameworks, and runtime features are driven by real world data from the usage of over 3 million developers on StackBlitz.com every month and npm trends.

## Handling Dependencies 
- without a requirements.txt, pyproject.toml or a package.json

```js
async function installDependencies() {
  // Install dependencies
  const installProcess = await webcontainerInstance.spawn('npm', ['install']);
  // Wait for install command to exit
  return installProcess.exit;
}
```

NodeJS
Multiple processes, Async promises, FS Operations, Built-ins, Http Server, Streams, Child processes, Inter, process, communication, timers, Event Emitter

For example, web containers has no problem with this. 
```js
{
  "name": "stackblitz-starters-9ozakx",
  "version": "1.0.0",
  "description": "",
  "main": "async-promises.js",
  "scripts": {
    "dev": "concurrently 'node async-promises.js' 'node ipc.js' 'node built-ins.js' 'node child-processes.js' 'node streams.js' 'node event-emitter.js' 'node multiple-node-processes.js' 'node timers.js' 'node file-system-operations.js' 'node http-server.js' "
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "concurrently": "^8.2.2"
  }
}
```

NodeJS is crucial because it evaluates the agent's ability to handle concurrency, manage child processes, and ensure performance efficiency. NodeJS's event-driven architecture makes it ideal for I/O-heavy tasks, and by leveraging multiple processes, the agent's proficiency in creating robust, performant applications is tested.

Package managers
NPM, Yarn, PNPM, Bun

Handling package managers ensures the ability to manage dependencies, resolve version conflicts, and execute scripts. It also demonstrates adaptability to different package management systems and optimizes for faster, more efficient builds.

Command Line (CLI)

CLI operations assess the capability to interact with the system shell, execute commands, and handle various command-line tools. It also tests the ability to parse command-line arguments and provide meaningful outputs or perform actions based on those commands.

Vite

Using Vite evaluates the ability to configure and optimize modern development environments. It also assesses proficiency in handling hot module replacement, faster builds, and leveraging Vite's advanced features to enhance developer productivity.

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list


Drizzle ORM

Drizzle ORM assesses the ability to map database tables to objects, handle complex relationships, and perform CRUD operations efficiently. It also tests the ability to optimize database access and integrate with other parts of the application seamlessly.


## Working with the Filesystem 
Working with the File System
WebContainer API gives you access to work with a virtual file system, right in memory. This page covers the mental model of how files are structured in WebContainers, how to load files and directories, as well as what file system operations are available in the API.

Mental model
A common package.json file in WebContainers is represented as a data structure of the following shape:

js
const files = {
  // This is a file - provide its path as a key:
  'package.json': {
    // Because it's a file, add the "file" key
    file: {
      // Now add its contents
      contents: `
        {
          "name": "vite-starter",
          "private": true,
         // ...
          },
          "devDependencies": {
            "vite": "^4.0.4"
          }
        }`,
    },
  },
};
It is a multiple-level nested object with the first key being the path, the second is called "file", and the third, which contains the actual contents of the file, is called "contents".

Similarly, a folder is represented in WebContainers as follows:

js
const files = {
  // This is a directory - provide its name as a key
  src: {
    // Because it's a directory, add the "directory" key
    directory: {
      // Here we will add files
    },
  },
};
Folder with a file is represented as follows:

js
const files = {
  // This is a directory - provide its name as a key
  src: {
    // Because it's a directory, add the "directory" key
    directory: {
      // This is a file - provide its path as a key:
      'main.js': {
        // Because it's a file, add the "file" key
        file: {
          contents: `
            console.log('Hello from WebContainers!')
          `,
        },
      },
    },
  },
};
Loading files
Use the mount method to load a file into the WebContainer's file system. The method expects an object following the structure of FileSystemTree, a type exported from @webcontainer/api. If you're not a TypeScript user, you can still leverage this using JSDoc.

Single file
To load a single file into a WebContainer instance, follow this format:

js
/** @type {import('@webcontainer/api').FileSystemTree} */

const files = {
  'package.json': {
    file: {
      contents: `
        {
          "name": "vite-starter",
          "private": true,
          "version": "0.0.0",
          "type": "module",
          "scripts": {
            "dev": "vite",
            "build": "vite build",
            "preview": "vite preview"
          },
          "devDependencies": {
            "vite": "^4.0.4"
          }
        }`,
    },
  },
};

await webcontainerInstance.mount(files);
This code loads a single file, package.json, at the root of your file system. Now you can read the file using readFile method:

js
const file = await webcontainerInstance.fs.readFile('/package.json');
Multiple files
To load multiple files to a WebContainer instance, add another key to the object you pass to mount method:

js
/** @type {import('@webcontainer/api').FileSystemTree} */

const files = {
  'package.json': {
    file: {
      contents: `
        {
          "name": "vite-starter",
          "private": true,
          "version": "0.0.0",
          "type": "module",
          "scripts": {
            "dev": "vite",
            "build": "vite build",
            "preview": "vite preview"
          },
          "devDependencies": {
            "vite": "^4.0.4"
          }
        }`,
    },
  },
  'index.html': {
    file: {
      contents: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <link rel="icon" type="image/svg+xml" href="/vite.svg" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Vite App</title>
          </head>
          <body>
            <div id="app"></div>
            <script type="module" src="/src/main.js"></script>
          </body>
        </html>`,
    },
  },
};

await webcontainerInstance.mount(files);
Folders
Take a look at the src directory in this file tree:

yaml
- src
  - main.js
  - main.css
- index.html
- package.json
In WebContainers, it will be reflected in the following format:

js
/** @type {import('@webcontainer/api').FileSystemTree} */

const files = {
  // This is a directory - provide its name as a key
  src: {
    // Because it's a directory, add the "directory" key
    directory: {
      // This is a file - provide its path as a key:
      'main.js': {
        // Because it's a file, add the "file" key
        file: {
          contents: `
            console.log('Hello from WebContainers!')
          `,
        },
      },
      // This is another file inside the same folder
      'main.css': {
        // Because it's a file, add the "file" key
        file: {
          contents: `
            body {
              margin: 0;
            }
          `,
        },
      },
    },
  },
  // This is a file outside the folder
  'package.json': {
    /* Omitted for brevity */
  },
  // This is another file outside the folder
  'index.html': {
    /* Omitted for brevity */
  },
};

await webcontainerInstance.mount(files);
To sum up. If the file you're loading is a folder, add a key directory and then proceed with adding its files.

Mounting to a different path
By default, the files are mounted into the file system to the root folder. However, you can mount them to a different path by using the mountPoint property:

js
/** @type {import('@webcontainer/api').FileSystemTree} */

const files = {
  'package.json': {
    /* Omitted for brevity */
  },
  'index.html': {
    /* Omitted for brevity */
  },
};

await webcontainerInstance.mount(files, { mountPoint: 'my-mount-point' });
WARNING

Before you mount, make sure that the folder you are mounting to exists. If it doesn't, WebContainers will throw an error.

You can create a folder using mkdir method:

js
await webcontainerInstance.fs.mkdir('my-mount-point');
await webcontainerInstance.mount(files, { mountPoint: 'my-mount-point' });
Generating snapshots
The mount() method not only accepts the tree-like format we described above, but a binary snapshot format that can be automatically generated, using the @webcontainer/snapshot package. Suppose we want our WebContainer API application to mount a source code folder that is present on our server. In that case, we could do the following:

typescript
import { snapshot } from '@webcontainer/snapshot';

// snapshot is a `Buffer`
const folderSnapshot = await snapshot(SOURCE_CODE_FOLDER);

// for an express-based application
app.get('/snapshot', (req, res) => {
  res
    .setHeader('content-type', 'application/octet-stream')
    .send(snapshot);
});

// for a SvelteKit-like application
export function getSnapshot(req: Request) {
  return new Response(sourceSnapshot, {
    headers: {
      'content-type': 'application/octet-stream',
    },
  });
}
Now, on the client side of our application we can fetch that snapshot and mount it:

```typescript
import { WebContainer } from '@webcontainer/api';

const webcontainer = await WebContainer.boot();

const snapshotResponse = await fetch('/snapshot');
const snapshot = await snapshotResponse.arrayBuffer();

await webcontainer.mount(snapshot);
```

### File System operations (fs)
WebContainers expose an fs property on the WebContainer instance (webcontainerInstance). Currently, fs supports a few methods:

readFile
readdir
rm
writeFile
mkdir
Let's take a closer look at them.

readFile
Reads the file at the given path. If the file does not exist, it will throw an error.

js
const file = await webcontainerInstance.fs.readFile('/package.json');
//    ^ it is a UInt8Array
By default, it returns a UInt8Array. You can pass a second argument to readFile to specify the encoding:

js
const file = await webcontainerInstance.fs.readFile('/package.json', 'utf-8');
//    ^ it is a string
readdir
Reads a given directory and returns an array of its files and directories.

js
const files = await webcontainerInstance.fs.readdir('/src');
//    ^ is an array of strings
If the directory doesn't exist, it will throw an error.

The readdir method takes two options: withFileTypes and encoding.

withFileTypes
When withFileTypes is set to true, the return value is an array of Dirent objects. Dirent objects have the following properties:

name - the name of the file or directory
isFile() - whether the entry is a file
isDirectory() - whether the entry is a directory
js
const files = await webcontainerInstance.fs.readdir('/src', {
  withFileTypes: true,
});
encoding
By default, readdir returns an array of strings. You can pass encoding option to readdir to specify the encoding.

js
const files = await webcontainerInstance.fs.readdir('/src', { encoding: 'buffer' });
//    ^ it is an array of UInt8Array
rm
Deletes a file or a directory. If the path is a file, it will delete the file. If the path is a directory, you need to provide a second argument with options recursive set to true to delete the directory and everything inside it, including nested folders.

js
// Delete a file
await webcontainerInstance.fs.rm('/src/main.js');

// Delete a directory
await webcontainerInstance.fs.rm('/src', { recursive: true });
You can also use force option to delete.

writeFile
Writes a file to the given path. If the file does not exist, it will create a new one. If the file exists, it will overwrite the file.

js
await webcontainerInstance.fs.writeFile('/src/main.js', 'console.log("Hello from WebContainers!")');
You can pass a third argument to writeFile to specify the encoding.

js
await webcontainerInstance.fs.writeFile(
  '/src/main.js',
  '\xE5\x8D\x83\xE8\x91\x89\xE5\xB8\x82\xE3\x83\x96\xE3\x83\xAB\xE3\x83\xBC\xE3\x82\xB9',
  { encoding: 'latin1' }
);
mkdir
Creates a directory at the given path. If the directory already exists, it will throw an error.

js
await webcontainerInstance.fs.mkdir('src');
You can use recursive option to create a nested folder very easily.

js
await webcontainerInstance.fs.mkdir('this/is/my/nested/folder', { recursive: true });