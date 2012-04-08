// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

/**
 * The Constraint Checker is responsible for checking constraints, both built-in
 * as well as custom ones.
 */

/*
 * Options:
 *   externalIdentifierProvider: external identifier provider, default: none
 *   externalModule: name of the current module within external index, default: none 
 *   allowDuplicates: classes of which instances with same identifier may exist, default: none
 *   automaticChecking: if set to false, do not run constraint checks when model changes, default: true
 */
Concrete.ConstraintChecker = function(rootClasses, identifierProvider, options) {
  
  this.options = options || {};
  this.options.allowDuplicates = this.options.allowDuplicates || [];
  this.rootClasses = rootClasses;
  this.identifierProvider = identifierProvider;
  this.externalIdentifierProvider = this.options.externalIdentifierProvider;
  this.featureConstraints = {};
  this._automaticChecking = (this.options.automaticChecking == undefined) ? true : this.options.automaticChecking;

  /**
   * Sets the model root - must be set for the checker to work.
   */ 
  this.setModelRoot = function(modelRoot) {
    this.modelRoot = modelRoot;
  },

  /**
   * Adds the given constraint.
   */
  this.addConstraint = function(constraint) {
    if( constraint instanceof Concrete.ConstraintChecker.FeatureValueConstraint ) {
      this.featureConstraints[constraint.klass()] = this.featureConstraints[constraint.klass()] || {};
      this.featureConstraints[constraint.klass()][constraint.feature()] = this.featureConstraints[constraint.klass()][constraint.feature()] || [];
      this.featureConstraints[constraint.klass()][constraint.feature()].push(constraint);
    }
  };


  this.elementAdded = function(element) {
  };

  this.elementRemoved = function(element) {
  };

  this.valueAdded = function(element, feature, value) {
  };

  this.valueRemoved = function(element, feature, value) {
  },

  this.valueChanged = function(element, feature, value, oldText, newText) {
  };

  this.commitChanges = function() {
    if( this._automaticChecking ) {
      this.updateAllProblems();
    }
  };

  // (ModelChangeListener interface implementation end)


  this.isValidInstance = function(type, element) {
    this._allowedTypes = this._allowedTypes || {};
    this._allowedTypes[type.name] = this._allowedTypes[type.name] || type.allSubTypes().concat(type);
    return this._allowedTypes[type.name].include(element.mmClass);
  };

  /**
   * Checks the given value of the attribute meta model feature passed.
   */
  this.isValidValue = function(mmFeature, value) {
    var opts = this.attributeOptions(mmFeature);
    return ( !(opts instanceof RegExp) || opts.test(value) )
        && (  (opts instanceof RegExp) || opts == undefined || opts.include(value) );
  };

  /**
   * @param mmFeature
   *            An attribute.
   * @returns A description of the possible values of the attribute passed.
   */
  this.attributeOptions = function(mmFeature) {
    var type = mmFeature.type;
    if( type.isEnum() ) {
      return type.literals;
    } else if( type.isBoolean() ) {
      return ["true", "false"];
    } else if( type.isInteger() ) {
      return /^(-?[1-9]\d*|0)$/;
    } else if( type.isFloat() ) {
      return /^(-?[1-9]\d*|0)(\.\d+)?$/;
    } else {
      return undefined;
    }
  };

  /**
   * @param slot
   *            The slot corresponding to a containment feature.
   * @returns A list of the name of all classes which are a sub type of the
   *          containment's type (including the type itself) and non-abstract.
   */
  this.elementOptions = function(slot) {
    var namesNonAbstracts = function(collection) {
      return collection.reject(function(t) { return t.abstract; }).collect(function(c) { return c.name; });
    };
    if( slot.hasClassName("ct_root") ) {
      return namesNonAbstracts(this.rootClasses);
    } else {
      var type = slot.mmFeature().type;
      return namesNonAbstracts(type.allSubTypes().concat(type));
    }
  };

  /**
   * Enable and disable automatic checking.
   */
  this.setAutomaticChecking = function(checking) {
    this._automaticChecking = checking;
  };

  /**
   * Run all constraint checks and update the error annotations. This method
   * must be called explicitly if automatic checking is disabled.
   */
  this.updateAllProblems = function() {
    var element = this.modelRoot.childElements().first();
    // in case the first element is an empty element, skip to next
    if (element && !element.isElement()) element = element.next();
    if (!element) return;
    var stack = [];
    if (this._intervalTimer) window.clearInterval(this._intervalTimer);
    this._intervalTimer = window.setInterval(function() {
      for( var i = 0; i < 100; i++ ) {
        this._updateElementProblems(element);
        element = Concrete.ModelInterface.Helper.nextElement(element, stack);
        if (!element) {
          window.clearInterval(this._intervalTimer);
          this._intervalTimer = undefined;
          break;
        }
      }
    }.bind(this), 40);  // check 25x per second
  };


  // --- private functions ---

  this._updateElementProblems = function(element) {
    if (!element || !element.isElement()) return [];
    this._removeErrors(element);
    this._checkElement(element).each(function(p) { this._addError(element, p); }, this);
    element.features.each(function(f) {
      this._removeErrors(f);
      this._checkFeature(element, f).each(function(p) { this._addError(f, p); }, this);
    }, this);
  };

  this._checkElement = function(element) {
    var problems = [];
    if (element.parentNode.hasClassName("ct_root")) {
      if (!this.rootClasses.include(element.mmClass)) {
        problems.push("element of class '"+element.mmClass.name+"' not allowed");
      }
    }
    else {
      if (!this.isValidInstance(element.mmFeature("ct_containment").type, element)) {
        problems.push("element of class '"+element.mmClass.name+"' not allowed");
      }
    }
    if (element.mmClass.abstract) {
      problems.push("class '"+element.mmClass.name+"' is abstract");
    }
    if (!this.options.allowDuplicates.include(element.mmClass)) {
      var ident = this.identifierProvider.getIdentifier(element);
      if (this.identifierProvider.getElement(ident) instanceof Array) {
        problems.push("duplicate identifier '"+ident+"'");
      }
      else if (this.externalIdentifierProvider) {
        var ei = this.externalIdentifierProvider.getElementInfo(ident, {ignoreModule: this.options.externalModule});
        if (ei) {
          var loc = Object.isString(ei.module) ? ei.module : "external module";
          problems.push("duplicate identifier '"+ident+"', also defined in "+loc);
        }
      }
    }
    return problems;
  };

  this._checkFeature = function(element, feature) {
    var problems = [];
    var mmf = feature.mmFeature;
    var children = feature.slot.childElements().select(function(c) { return !c.hasClassName("ct_empty"); });
    var featureConstraints = this._featureConstraints(element, feature);
    if (mmf.upperLimit > -1 && children.size() > mmf.upperLimit) {
      if (mmf.upperLimit == 1) {
        if (mmf.isContainment()) {
          problems.push("only one element may be specified as '"+mmf.name+"'");
        }
        else {
          problems.push("only one value may be specified as '"+mmf.name+"'");
        }
      }
      problems.push("above upper limit of '"+mmf.upperLimit+"'");
    }
    if (mmf.lowerLimit > 0 && children.size() < mmf.lowerLimit) {
      if (mmf.lowerLimit == 1) {
        problems.push("'"+mmf.name+"' must be specified");
      }
      else {
        problems.push("below lower limit of '"+mmf.upperLimit+"'");
      }
    }
    if (mmf.isContainment()) {
      // correct element type is checked for each element
      children.each(function(c) {
        this._checkFeatureConstraints(featureConstraints, element, c, problems);
      }, this);
    }
    else if (mmf.isReference()) {
      children.each(function(c) {
        var targets = this.identifierProvider.getElement(c.value);
        if (!(targets instanceof Array)) targets = [targets].compact();
        if (this.externalIdentifierProvider) {
          var ei = this.externalIdentifierProvider.getElementInfo(c.value, {ignoreModule: this.options.externalModule});
          if (ei) {
            // here we add a type instead of an element
            targets = targets.concat(ei.type);
          }
        }
        if (targets.size() == 0) {
          problems.push("can not resolve reference");
        }
        else if (targets.size() > 1) {
          problems.push("multiple targets for reference");
        }
        else {
          var type = targets[0].mmClass ? targets[0].mmClass : targets[0];
          if (!(mmf.type.allSubTypes().concat(mmf.type).include(type))) {
            problems.push("reference to class '"+type.name+"' not allowed");
          }
          else if (targets[0].mmClass) {
            // if target is an element, i.e. is local
            this._checkFeatureConstraints(featureConstraints, element, targets[0], problems);
          }
        }
      }, this);
    }
    else {
      children.each(function(c) {
        if (!this.isValidValue(mmf, c.value)) {
          problems.push("value not allowed");
        }
        else {
          this._checkFeatureConstraints(featureConstraints, element, c.value, problems);
        }
      }, this);
    }
    return problems.uniq();
  };

  /**
   * @returns The feature constraints for the indicated feature of the given
   *          model element, or an empty array.
   */
  this._featureConstraints = function(element, feature) {
    var byFeature = this.featureConstraints[element.mmClass.name];
    return ( byFeature && byFeature[feature.mmFeature.name] ) || [];
  };

  this._checkFeatureConstraints = function(constraints, element, value, problems) {
    constraints.each(function(c) {
      if( !c.check(element, value) ) {
        problems.push(c.message(element, value));
      }
    });
  };

  /**
   * Adds an error message 'text' to the given node by adding an invisible
   * popup to the node (=DOM element) which is made visible by
   * Concrete.Editor._handleErrorPopups.
   */
  this._addError = function(node, text) {
    if( !node._errorDescriptions ) {
      node._errorDescriptions = [];
      node.addClassName("ct_error");
    }
    var desc = Concrete.Helper.createDOMNode("div", { 'class': "ct_error_description ct_hidden" }, text);
    node.appendChild(desc);
    node._errorDescriptions.push(desc);
  };

  /**
   * Removes all error messages from the given node (=DOM element).
   */
  this._removeErrors = function(node) {
    if( node._errorDescriptions ) {
      node._errorDescriptions.each(function(d) { d.remove(); });
      node.removeClassName("ct_error");
      node._errorDescriptions = undefined;
    }
  };

};

Concrete.ConstraintChecker.FeatureValueConstraint = function(options) {

  this.options = options;

  this.klass = function() {
    return this.options["class"];
  };

  this.feature = function() {
    return this.options.feature;
  };

  this.check = function(element, target) {
    return this.options.checker(element, target);
  };

  this.message = function(element, target) {
    var msg = this.options.message;
    return Object.isFunction(msg) ? msg(element, target) : msg;
  };

};

