import {createSystem, System} from './System.js';
import {createCore} from './createCore.js';
import createCoreInstance from './Core.js'; // This is the function that returns the proxied core
import Component from './Component.js';
import Config from './Config.js';

export {System, createSystem, createCore, createCoreInstance as Core, Component, Config};
export default System;