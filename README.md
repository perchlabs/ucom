# Ucom - Utterly Unified Components.

Ucom is a buildless declarative [custom element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) framework. It comes in three flavors:

* ucom (`20.7k` minified) (`8.2k` gzipped)
* ucom_vue (`28.8k` minified) (`11.9k` gzipped)
* ucom_lite (`7.1k` minified) (`3.1k` gzipped)

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
  <source src="/components/my-component.ucom">

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

Ucom has Alpine/Vue style templating.

Directives include;

- `u-show`
- `u-for`
- `u-html`
- `u-ref`
- `u-is`
- `@` (handler)
- `%` (text)
- `:` (bind)

`meta` void element specific options.

- `$` (data)
- `%` (text)

```html
<template u-com>
  <div u-for="n in 10" @click="alert(n)" %n></div>
</template>
```

While displaying text a `meta` [void element](https://developer.mozilla.org/en-US/docs/Glossary/Void_element) tag is converted to span.  This is fine because the shadow root of the web component separates it from the main HTML document.

This was chosen as a compromise between the ugly verbose Alpine style and the more complicated Vue style.  This way we don't need to parse text nodes with complicated regular expressions.

```html
<template u-com>
  <!-- Inline calculation -->
  Exponential:
  <div u-for="n in 5">
    <meta %n=>, <meta %n="n**2">, <meta %="n**3">
  </div>

  <!-- Precalculate (saved to the current sub-scope) -->
  Exponential:
  <div u-for="n in 5">
    <meta
      $n1="n**1"
      $n2="n**2"
      $n3="n**3"
    >
    <meta %n1>, <meta %n2>, <meta %n3>
  </div>
</template>
```

You can use the store to gain access to reactive data by declaring it in a `meta` void tag (no closing tag required).

Use modifiers `.sync`, `.save` or `.calc`.

```html
<template u-com>
  <!-- data is very flexible -->
  <meta
    $count=1
    $double.calc="() => count * 2"
    $.calc="{triple: () => count * 3}"
  >

  <button @click="count++">Once: <meta %count></button>

  <div>Double it <meta %double></div>

  <div>Triple it <meta %triple></div>

  <script>
    export function connectedCallback() {
      const {$data} = this
      this.$effect(() => console.log('count: ', $data.count))
      this.$effect(() => console.log('double: ', $data.double))
    }
  </script>
</template>
```

#### Syncronized and Persistent Reactive Data

```html
<template u-com>
  <meta
    $normal=0
    $persist.save=0
    $share.sync=0
    $total.calc="() => normal + persist + share"
  >

  <!-- Normal store counter -->
  <button @click="normal++"><meta %normal> times</button>

  <!-- Changes to this counter will be syncronized across all elements of the same name. -->
  <button @click="share++"><meta %share> times</button>

  <!-- This counter will be both syncronized and persisted across all instances of this element -->
  <!-- of the same name (and page refreshes of this self-instantiated custom element) -->
  <button @click="persist++"><meta %persist> times</button>

  <div>You have clicked a total of <meta %total> times</div>
</template>
```

It's easy to add js properties and html attributes to your components using the `param` void element (no closing tag needed).

```html
<my-counter count="5"></my-counter>

<template u-com="my-counter">
  <param $count=0 cast="parseInt">

  <button @click="count++"><meta %count> times</button>
</template>
```

#### Dynamic Element Creation

`u-is` allows for a dynamic tag to be defined based upon a store value.

```html
<dyn-amic name="my-other-component"></dyn-amic>

<template u-com="dyn-amic">
  <param $name>

  <template u-is="name"></template>
</template>
```
