// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.AbstractIdentifierProvider = Class.create({

  initialize: function() {
    this._elementByIdentifier = {};
    this._identifierChangeListeners = [];
  },

  /**
   * Returns the identifier for +element+.
   * Returns undefined if the element has no identifier.
   */
  getIdentifier: function(element) {
    return element._identifier;
  },

  /**
   * Returns the element associated with +identifier+.
   * Returns an array if several elements exist with this identifer
   * Returns undefined if there is no element with this identifier.
   */
  getElement: function(identifier) {
    return this._elementByIdentifier[identifier];
  },

  /**
   * Add a listener object which must provide the method
   *
   *   identifierChanged(element, oldIdent, newIdent)
   *
   * if a new identifier is created, oldIdent will be undefined.
   * if an identifier is removed, newIdent will be undefined
   */
  addIdentifierChangeListener: function(listener) {
    this._identifierChangeListeners.push(listener);
  },

  // ModelChangeListener Interface

  elementAdded: function(element) {
    throw new Error("Abstract, override in subclass");
  },

  elementRemoved: function(element) {
    throw new Error("Abstract, override in subclass");
  },

  valueAdded: function(element, feature, value) {
    throw new Error("Abstract, override in subclass");
  },

  valueRemoved: function(element, feature, value) {
    throw new Error("Abstract, override in subclass");
  },

  valueChanged: function(element, feature, value, oldText, newText) {
    throw new Error("Abstract, override in subclass");
  },

  commitChanges: function() {
    throw new Error("Abstract, override in subclass");
  },

  // ModelChangeListener End

  // Private

  _changeIdentifier: function(element, identifier) {
    var oldIdentifier = element._identifier;
    var identifierChanged = (identifier != oldIdentifier);
    if (identifierChanged) {
      // old identifier
      if (oldIdentifier) {
        var ebi = this._elementByIdentifier[oldIdentifier];
        if (ebi instanceof Array) {
          var idx = ebi.indexOf(element);
          if (idx >= 0) delete ebi[idx];
          ebi = ebi.compact();
          this._elementByIdentifier[oldIdentifier] = (ebi.size() > 1) ? ebi : ebi.first();
        }
        else {
          delete this._elementByIdentifier[oldIdentifier];
        }
      }
      // new identifier
      if (identifier == undefined) {
        delete element._identifier;
      }
      else {
        var ebi = this._elementByIdentifier[identifier];
        if (ebi instanceof Array) {
          ebi.push(element);
        }
        else if (ebi) {
          this._elementByIdentifier[identifier] = [ebi, element];
        }
        else {
          this._elementByIdentifier[identifier] = element;
        }
        element._identifier = identifier;
      }
      this._identifierChangeListeners.each(function(l) {
        l.identifierChanged(element, oldIdentifier, identifier);
      });
    }
  }
});

Concrete.QualifiedNameBasedIdentifierProvider = Class.create(Concrete.AbstractIdentifierProvider, {

  // Options:
  // - nameAttribute: name of the attribute which holds an element's (non qualified) name, defaults to "name"
  // - separator: separator between parts (non qualified names) of qualified name, defaults to "/"
  // - leadingSeparator: specifies if qualified names should start with a leading separator, defaults to "true"
  initialize: function($super, options) {
    $super();
    this.options = options || {};
    this.options.nameAttribute = this.options.nameAttribute || "name";
    this.options.separator = this.options.separator || "/";
    if (this.options.leadingSeparator == undefined) this.options.leadingSeparator = true;
  },

  // ModelChangeListener Interface

  elementAdded: function(element) {
    this._updateElement(element);
  },

  elementRemoved: function(element) {
    this._removeIdentifiers(element);
  },

  valueAdded: function(element, feature, value) {
    this._updateElement(element);
  },

  valueRemoved: function(element, feature, value) {
    this._updateElement(element);
  },

  valueChanged: function(element, feature, value, oldText, newText) {
    this._updateElement(element);
  },

  commitChanges: function() {
	  // (no behavior)
  },

  // ModelChangeListener End

  _updateElement: function(element) {
    var parent = element.ancestors().find(function(a) {return a._identifier; });
    var qnamePrefix = (parent && parent._identifier) || "";
    this._updateQNames(element, qnamePrefix);
  },

  _updateQNames: function(element, qnamePrefix) {
    var nameAttribute = element.features.find(function(f) { return f.mmFeature.name == this.options.nameAttribute; }, this);
    var nameValue = nameAttribute && nameAttribute.slot.childElements().select(function(e) { return !e.hasClassName("ct_empty"); }).first();
    var name = nameValue && nameValue.value;
    var qname = null;
    if (name) {
      if (qnamePrefix.length > 0 || this.options.leadingSeparator) {
        qname = qnamePrefix+this.options.separator+name;
      }
      else {
        qname = name;
      }
      this._changeIdentifier(element, qname);
    }
    else {
      qname = qnamePrefix;
      this._changeIdentifier(element, undefined);
    }
    element.features.each(function(f) {
      if (f.mmFeature.isContainment()) {
        f.slot.childElements().each(function(e) {
          this._updateQNames(e, qname);
        }, this);
      }
    }, this);
  },

  _removeIdentifiers: function(element) {
    this._changeIdentifier(element, undefined);
    element.features.each(function(f) {
      if (f.mmFeature.isContainment()) {
        f.slot.childElements().each(function(e) {
          this._removeIdentifiers(e);
        }, this);
      }
    }, this);
  }

});

