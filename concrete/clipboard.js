// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.Clipboard = function(storageElement) {

	this.element = storageElement;
	this.kind = undefined;

	this.read = function() {
		var data = this._readRaw();
		if (data && Object.isString(data) && data.isJSON()) {
			return data.evalJSON();
		}
		return data;
	};

	this.write = function(data) {
		if (data instanceof Object) {
			this._writeRaw(Concrete.Helper.prettyPrintJSON(Object.toJSON(data)));
		}
		else {
			this._writeRaw(data);
		}
	};
	
	this.containsElement = function() {
		var data = this._readRaw();
		return data && Object.isString(data) && data.isJSON();
	};
	
	this.containsValue = function() {
		var data = this._readRaw();
		return data && Object.isString(data) && !data.isJSON();
	};
	
	this._readRaw = function() {
		if (this.element) {
			if (this.element.tagName == "TEXTAREA") {
				return this.element.value;
			}
			return this.element.innerHTML;
		}
		return this.data;		
	};

	this._writeRaw = function(data) {
		if (this.element) {
			if (this.element.tagName == "TEXTAREA") {
				this.element.value = data;
			}
			else {
				this.element.innerHTML = data;
			}
		}
		else {
			this.data = data;
		}		
	};
		
};

