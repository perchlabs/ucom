# Ucom - Utterly Unified Components.

Ucom is a buildless declarative [custom element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) framework. It comes in three flavors:

* ucom (`20.1k` minified) (`7.7k` gzipped)
* ucom_vue (`30.1k` minified) (`12.1k` gzipped)
* ucom_lite (`8.3k` minified) (`3.4k` gzipped)

**Notice** This technology is currently unversioned.  An alpha version should be arriving before Spring.

### Installation

```html
<script src="/js/ucom.js" type="module"></script>
```

### Declare Components

Create a template with a `u-com` attribute. It will be registered as a custom element using shadow dom.  You can then use that element normally anywhere on your page.

```html
<template u-com="my-component">
  Now we're starting to get serious.
</template>

<!-- Use the custom element normally anywhere, even within another framework. -->
<my-component><my-component>
```

For the event lifecycle use the element callbacks `attributeChangedCallback`, `connectedCallback`, `disconnectedCallback`.

```html
<template u-com="my-component">
  <script>
    // This function will be merged into the custom element prototype.
    export function connectedCallback() {
      console.log('Element has been added to the DOM.')
    }

    export default class extends HTMLElement {
      disconnectedCallback() {
        console.log('Element has been removed from the DOM.')
      }
    }
  </script>
</template>
```

### App

Create an immediately executed component app with a `u-app` attribute.

```html
<template u-app>
  <source src="/components/my-component.ucom/">

  This is an inline, self-instantiated app.
  You can use this to bootstrap, to create layouts, or to write quick one-offs.

  <my-component></my-component>
</template>
```

### Importing

You can use the `source` tag inside of any component to declaratively import component dependencies.

```html
<template u-com="my-component">
  <source src="/components/other-component.html">

  <header>Content</header>
  <other-component><other-component>
</template>
```


```html
<!-- /components/other-component.html -->

<div>This is another component.</div>
```

You may use an [importmap](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap) for component paths.  All paths are resolved with [import.meta.resolve](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta/resolve).


```html
<script type="importmap">{
  "imports": {
    "@com/": "/components/"
  }
}</script>

<template u-app>
  <source src="@com/widget-component.html">
  <source src="@com/second-component.html">

  <widget-component></widget-component>
  <second-component></second-component>
</template>
```

Use a `base` element to reduce redundancy.  Settings on `base` are sticky until the next `base`.

```html
<script type="importmap">{
  "imports": {
    "@com/": "/components/"
  }
}</script>

<template u-app>
  <base href="@com/">
  <source src="widget-component.html">
  <source src="second-component.html">

  <widget-component></widget-component>
  <second-component></second-component>
</template>
```

Components can be imported lazily by adding the `"lazy"` attribute to either a `source` or `base` element.

```html
<script type="importmap">{
  "imports": {
    "@com/": "/components/"
  }
}</script>

<template u-app>
  <base href="@com/" lazy>
  <source src="widget-component.html">
  <source src="second-component.html">

  <widget-component></widget-component>
  <second-component></second-component>
</template>
```

### Importing Components As Directory

Components can be specified as directory by using suffix `.ucom`.  This is useful for bundling libraries, themes and data files into an easily redistributable component.

```html
<template u-app>
  <!-- To specify a component directory end with .ucom -->
  <source src="/components/complex-component.ucom">
</template>
```

The component will be a `.html` file with the same name as the `.ucom` directory.
```
@com/complex-component.ucom/
+-- complex-component.html
+-- important_library.js
+-- data_theme.css
+-- field_data.json
```

```html
<!-- /components/complex-component.ucom/complex-component.html -->

<header>This component does a lot of complicated things.</header>
<main></main>

<script>
  import lib from './important_library.js'
  import data from './field_data.json' with { type: 'json' }

  export function connectedCallback() {
    const main = this.$querySelector('main')
    lib.load(data)
    lib.bind(main)
  }
</script>

<style>
  /* This CSS will not escape the shadow dom */
  @import "./data_theme.css";
</style>
```

### Theming

Element IDs are sandboxed via shadow dom.

```html
<template u-app>
  <header id="header">Stylized Component</header>
  <main>Component Body</main>

  <style>
    #header {
      color: green;
    }
    main {
      color: blue;
    }
  </style>
</template>
```

You can "pierce" the shadow dom of a component with themes by adding the `u-com` attribute to the `style` or `link` element.  Ucom will add this styling to all custom elements by adding it to its  `adoptedStyleSheets`.

You may also use a dynamic CSS `@import` within the `style` tag of each of your components.

```html
<!DOCTYPE html>
  <head>
    <!-- u-com on a link or style will cause it to be attached to all components "piercing" it. -->
    <link u-com rel="stylesheet" href="/style/bootstrap-5.3.2.min.css">
    <style u-com>
      @import url("/style/test.css");
    </style>
  </head>
```

### Templating

Ucom has Alpine-style templating, with the `u-` prefix.

Directives include; `u-show`, `u-for`, `u-bind`, `u-html`, `u-on`, `u-ref`, `u-text`.

```html
<template u-app>
  <div u-for="n in 10" u-text="n"></div>
</template>
```

You can use the store to gain access to reactive data.

```html
<template u-app>
  <button u-on:click="count++"><span u-text="count"></span> times</button>
  <script>
    export const $store = {count: 0}

    export function $store() {
      return {
        count: 0,
      }
    }

    export function connectedCallback() {
      this.$effect(() => console.log(this.$data.count))
    }
  </script>
</template>
```

#### Syncronized and Persistent Reactive Data

If you wrap a store value with the `sync` and `persistent` function then it will gain some features.

```html
<template u-app>
  <!-- Normal store counter -->
  <button u-on:click="normal++"><span u-text="normal"></span> times</button>

  <!-- Changes to this counter will be syncronized across all elements of the same name. -->
  <button u-on:click="sync++"><span u-text="sync"></span> times</button>

  <!-- This counter will be both syncronized and persisted across all instances of this element -->
  <!-- of the same name (and page refreshes of this self-instantiated custom element) -->
  <button u-on:click="persist++"><span u-text="persist"></span> times</button>

  <script>
    export function $store({persist, sync}) {
      return {
        normal: 0,
        persist: persist(0),
        sync: sync(0),
      }
    }
  </script>
</template>
```

It's easy to add js properties and html attributes to your components.

```html
<my-counter count="5"></my-counter>

<template u-com="my-counter">
  <button u-on:click="count++"><span u-text="count"></span> times</button>

  <script>
    export function $props() {
      return {
        count: {
          default: 0,
          cast: parseInt,
        },
      }
    }
  </script>
</template>
```

#### Dynamic Element Creation

Ucom added a new `u-is` directive to its petite-vue inheritance.  `u-is` allows for a dynamic element name to be defined based upon a store value.  This is useful for routing and other situations.

```html
<dyn-amic name="my-other-component"></dyn-amic>

<template u-com="dyn-amic">
  <template u-is="name"></template>

  <script>
    export function $props() {
      return {
        name: '',
      }
    }
  </script>
</template>
```
