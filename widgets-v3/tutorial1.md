# Tutorial de Ubee Glass

## Instalación / Configuración

### Paso 1 - Descargar o clonar el repositorio de Ubee Glass

Repositorio: https://github.com/badillosoft/ubee-glass

> git clone https://github.com/badillosoft/ubee-glass.git

### Paso 2 - Instalar el módulo global `serve` de NodeJS

> npm i -g serve

### Paso 3 - Levantar el servidor en la carpeta ubee-glass

> cd ubee-glass

> serve .

### Paso 4 - Abrir ubee-glass en el navegador

Abrir en un navegador http://localhost:5000

Navegar hasta sus aplicaciones o widgets

## Crear un componente

### Paso 1 - Crear la carpeta de widgets

Crear la carpeta `widgets-xxx` dónde `xxx` son tus iniciales.

> mkdir widgets-xxx

### Paso 2 - Crear el archivo del widget

Crear un archivo `.html` con el nombre del widget. El cuál contendrá etiquetas de componentes, librerías, interfaces, etc.

> Ejemplo de un componente básico `/widgets-xxxx/button.html`

~~~html
<div data-component="mi-componente">
    <button data-subscribe-click="alert('Hi')">Hello</button>
</div>
~~~

## Crear una aplicación glass

### Paso 1 - Definir la plantilla

Crear un archivo `.html` con esqueleto para `HTML5` como el siguiente.

~~~html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>My App</title>
</head>
<body>
    <div data-glass="app">
        <div data-module="app-module">
            <datalist data-source="/widgets-xxxx/button.html">
                <option data-install-component="button-component"></option>
            </datalist>
        </div>
        <div data-use="button-component"></div>
    </div>
    <script src="../lib/ubee-glass-v3.js"></script>
    <script>ubee_glass("app")</script>
</body>
</html>
~~~

