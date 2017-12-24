'use strict';
require("babel-core/register");
require("babel-polyfill");

const chai = require('chai');
global.should = chai.should();
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);