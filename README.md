# Ucom - Utterly Unified Components.

Ucom is a buildless declarative [custom element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) framework. It comes in three flavors:

* ucom (`18.8k` minified) (`7.4k` gzipped)
* ucom_vue (`28.7k` minified) (`11.9k` gzipped)
* ucom_lite (`7.0k` minified) (`3.1k` gzipped)

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

Create an immediately executed component app with an empty `u-com` attribute.

```html
<template u-com>
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

<template u-com>
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

<template u-com>
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

<template u-com>
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
<template u-com>
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
    const main = this.$('main')
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
<template u-com>
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

Ucom has Alpine/Vue style templating, with the `u-` prefix.

Directives include; `u-show`, `u-for`, `u-bind`, `u-html`, `u-on`, `u-ref`, `u-text`.

```html
<template u-com>
  <div u-for="n in 10" u-text="n" u-on:click="alert(n)"></div>
</template>
```

Use Vue style shortcuts.  `&` is short for `u-text:`, `@` is short for `u-on:`
```html
<template u-com>
  <div u-for="n in 10" &n @click="alert(n)"></div>
</template>
```

While displaying text a `meta` [void element](https://developer.mozilla.org/en-US/docs/Glossary/Void_element) tag is converted to span.  This is fine because the shadow root of the web component separates it from the main HTML document.

This was chosen as a compromise between the ugly verbose Alpine style and the more complicated Vue style.  This way we don't need to parse text nodes with complicated regular expressions.

```html
<template u-com>
  <!-- The ugly Alpine style way -->
  Powers of two:
  <div u-for="n in 5">
    <span u-text="n"></span>, <span u-text="n * 2"></span>, <span u-text="n * 4"></span>
  </div>

  <!-- The pretty Ucom way -->
  Powers of two:
  <div u-for="n in 5">
    <meta &n>, <meta &="n*2">, , <meta &="n*4">
  </div>
</template>
```

You can use the store to gain access to reactive data.

```html
<template u-com>
  <button @click="count++"><meta &count> times</button>
  <div>Double it <meta &double></div>

  <script>
    export function $store({computed}) {
      return {
        count: 0,
        double: computed($d => $d.count * 2),
      }
    }

    export function connectedCallback() {
      this.$effect(() => console.log('count: ', this.$data.count))
      this.$effect(() => console.log('double: ', this.$data.double))
    }
  </script>
</template>
```

#### SyncronizedPersistent Reactive Data

If you wrap a store value with the `synced` and `persisted` function then it will gain some features.

```html
<template u-com>
  <!-- Normal store counter -->
  <button @click="normal++"><meta &normal> times</button>

  <!-- Changes to this counter will be syncronized across all elements of the same name. -->
  <button @click="sync++"><meta &sync> times</button>

  <!-- This counter will be both syncronized and persisted across all instances of this element -->
  <!-- of the same name (and page refreshes of this self-instantiated custom element) -->
  <button @click="persist++"><meta &persist> times</button>

  <div>You have clicked a total of <meta &total> times</div>

  <script>
    export function $store({computed, persisted, synced}) {
      return {
        normal: 0,
        persist: persisted(0),
        sync: synced(0),
        total: computed($d => $d.normal + $d.persist + $d.sync),
      }
    }
  </script>
</template>
```

It's easy to add js properties and html attributes to your components.

```html
<my-counter count="5"></my-counter>

<template u-com="my-counter">
  <button @click="count++"><meta &count> times</button>

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

`u-is` allows for a dynamic tag to be defined based upon a store value.

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
