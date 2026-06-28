import { mount, unmount } from "svelte";
import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) throw new Error('No element with id "app" found');

let app = mount(App, { target });

// import.meta.hot is replaced with `undefined` in production builds, so the
// guard is required at runtime even though its type is always truthy here.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    void (async () => {
      await unmount(app, { outro: true });
      app = mount(App, { target });
    })();
  });
}
