Concrete.Editor.CommandHelper = {

  referenceOptions: function(type, editor) {
    var idents = editor.modelInterface.elements()
      .select(function(e) { return editor.constraintChecker.isValidInstance(type, e);})
      .collect(function(e) { return editor.identifierProvider.getIdentifier(e); });
    if (editor.externalIdentifierProvider) {
      idents = idents.concat(editor.externalIdentifierProvider.getIdentifiers(type));
    }
    return idents.select(function(i) { return( i && i.length > 0 ); });
  },

  canAutoHide: function(feature) {
    return (!feature.hasClassName("ct_error") &&
      (feature.hasClassName("ct_always_hide") || 
      (feature.hasClassName("ct_auto_hide") && (feature.down(".ct_slot").childElements().select(function(e) { return !e.hasClassName("ct_empty"); }).size() == 0))));
    },

  canAddElement: function(slot, editor) {
    var numElements = slot.childElements().select(function(c){ return c.hasClassName("ct_element"); }).size();
    if (slot.hasClassName("ct_root")) {
      return editor.maxRootElements == -1 || numElements < editor.maxRootElements;
    }
    return slot.mmFeature().upperLimit == -1 || numElements < slot.mmFeature().upperLimit;
  },

  showAllNonAutoHideFeatures: function(n, editor) {
    n.select(".ct_attribute, .ct_reference, .ct_containment").each(function(f) {
      if( !Concrete.Editor.CommandHelper.canAutoHide(f) ) {
        editor.showHiddenFeature(f);
      }
    });
  },

  removeValue: function(n, editor) {
    if (n.siblings().select(function(s){ return s.hasClassName("ct_value"); }).size() == 0) {
      n.insert({after: editor.templateProvider.emptyValue(n.feature())});
    }
    if (n.next()) {
      editor.selector.selectDirect(n.next());
    }
    else {
      editor.selector.selectDirect(n.previous());
    }
    editor.modelInterface.removeValue(n);
    editor.adjustMarker();
  }

};


/**
 * An enumeration of all the available commands/actions in the editor.
 */
Concrete.Editor.Commands = [

  {
    name: "Edit Attribute",
    trigger: "edit_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && n.mmFeature().isAttribute();
    },
    run: function(n, editor) {
      editor.inlineEditor.edit(n, {
        init: n.value,
        options: editor.constraintChecker.attributeOptions(n.mmFeature()),
        onSuccess: function(v) {
          if( n.value != v ) {
            editor._setDirtyState();
          }
          if (n.hasClassName("ct_empty")) {
            editor.modelInterface.createValue(n, "after", v);
            editor.selector.selectDirect(n.next());
            n.remove();
          }
          else {
            editor.modelInterface.changeValue(n, v);
          }
          editor.adjustMarker();
        }
      });
    }
  },

  {
    name: "Add Attribute",
    trigger: "insert_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && !n.hasClassName("ct_empty") && n.mmFeature().isAttribute() &&
        (n.mmFeature().upperLimit == -1 || n.siblings().select(function(s){ return s.hasClassName(".ct_value"); }).size()+1 < n.mmFeature().upperLimit);
    },
    run: function(n, editor) {
      n.insert({after: editor.templateProvider.emptyValue(n.feature())});
      var temp = n.next();
      editor.selector.selectDirect(temp);
      editor.inlineEditor.edit(temp, { init: "",
        options: editor.constraintChecker.attributeOptions(n.mmFeature()),
        onSuccess: function(v) {
          temp.remove();
          editor.modelInterface.createValue(n, "after", v);
          editor.selector.selectDirect(n.next());
          editor._setDirtyState();
        }, 
        onFailure: function() {
          temp.remove();
          editor.selector.selectDirect(n);
        }
      });
    }
  },

  {
    name: "Remove Attribute",
    trigger: "delete_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && !n.hasClassName("ct_empty") && n.mmFeature().isAttribute();
    },
    run: function(n, editor) {
      Concrete.Editor.CommandHelper.removeValue(n, editor);
      editor._setDirtyState();
    }
  },

  {
    name: "Edit Reference",
    trigger: "edit_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && n.mmFeature().isReference();
    },
    run: function(n, editor) {
      editor.inlineEditor.edit(n, { init: n.value, partial: true,
        options: Concrete.Editor.CommandHelper.referenceOptions(n.mmFeature().type, editor),
        onSuccess: function(v) {
          if (n.hasClassName("ct_empty")) {
            editor.modelInterface.createValue(n, "after", v);
            editor.selector.selectDirect(n.next());
            n.remove();
          }
          else {
            if( n.value != v ) {
              editor._setDirtyState();
            }
            editor.modelInterface.changeValue(n, v);
          }
          editor.adjustMarker();
        }
      });
    }
  },

  {
    name: "Add Reference",
    trigger: "insert_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && !n.hasClassName("ct_empty") && n.mmFeature().isReference() &&
        (n.mmFeature().upperLimit == -1 || n.siblings().select(function(s){ return s.hasClassName(".ct_value"); }).size()+1 < n.mmFeature().upperLimit);
    },
    run: function(n, editor) {
      n.insert({after: editor.templateProvider.emptyValue(n.feature())});
      var temp = n.next();
      editor.selector.selectDirect(temp);
      editor.inlineEditor.edit(temp, { init: "", partial: true,
        options: Concrete.Editor.CommandHelper.referenceOptions(temp.mmFeature().type, editor),
        onSuccess: function(v) {
          temp.remove();
          editor.modelInterface.createValue(n, "after", v);
          editor.selector.selectDirect(n.next());
          editor._setDirtyState();
        }, 
        onFailure: function() {
          temp.remove();
          editor.selector.selectDirect(n);
        }
      });
    }
  },

  {
    name: "Remove Reference",
    trigger: "delete_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && !n.hasClassName("ct_empty") && n.mmFeature().isReference();
    },
    run: function(n, editor) {
      Concrete.Editor.CommandHelper.removeValue(n, editor);
      editor._setDirtyState();
    }
  },

  {
    name: "Create Element",
    trigger: "edit_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_element") && n.hasClassName("ct_empty");
    },
    run: function(n, editor) {
      editor.inlineEditor.edit(n, { init: "", partial: false,
        options: editor.constraintChecker.elementOptions(n.up()),
        onSuccess: function(v) {
          editor.modelInterface.createElement(n, "after", {_class: v});
          editor.showHiddenFeatures(n.next());
          editor.selector.selectDirect(n.next());
          n.remove();
          editor.adjustMarker();
          editor._setDirtyState();
        }
      });
    }
  },

  {
    name: "Replace Element",
    trigger: "edit_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_element") && !n.hasClassName("ct_empty");
    },
    run: function(n, editor) {
      var handle = n.findFirstDescendants(["ct_handle"], ["ct_element"]).first() || n;
      editor.inlineEditor.edit(handle, { init: n.mmClass.name,
        options: editor.constraintChecker.elementOptions(n.up()),
        onSuccess: function(v) {
          var data = editor.modelInterface.extractModel(n);
          data._class = v;
          editor.modelInterface.createElement(n, "after", data);
          editor.selector.selectDirect(n.next());
          editor.modelInterface.removeElement(n);
          editor.adjustMarker();
          editor._setDirtyState();
        }
      });
    }
  },

  {
    name: "Add Element",
    trigger: "insert_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_element") && !n.hasClassName("ct_empty") && Concrete.Editor.CommandHelper.canAddElement(n.up(), editor);
    },
    run: function(n, editor) {
      n.insert({after: editor.templateProvider.emptyElement(n.parentNode, n.feature())});
      var temp = n.next();
      editor.selector.selectDirect(temp);
      editor.inlineEditor.edit(temp, { init: "",
        options: editor.constraintChecker.elementOptions(n.up()),
        onSuccess: function(v) {
          editor.modelInterface.createElement(n, "after", {_class: v});
          editor.selector.selectDirect(n.next());
          editor.showHiddenFeatures(n.next());
          temp.remove();
          editor.adjustMarker();
          editor._setDirtyState();
        },
        onFailure: function(v) {
          temp.remove();
          editor.selector.selectDirect(n);
        }
      });
    }
  },

  {
    name: "Remove Element",
    trigger: "delete_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_element") && !n.hasClassName("ct_empty");
    },
    run: function(n, editor) {
      editor.removeElements(editor.allSelected());
      editor._setDirtyState();
    }
  },

  {
    name: "Hide Empty Features",
    trigger: "hide_empty_event",
    readOnly: true,
    enable: function(n, editor) {
      return n.hasClassName("ct_element");
    },
    run: function(n, editor) {
      editor.allSelected().each(function(s) {
        editor.hideEmptyFeatures(s);
      });
    }
  },

  {
    name: "Show Hidden Features",
    trigger: "show_hidden_event",
    readOnly: true,
    enable: function(n, editor) {
      return true;
    },
    run: function(n, editor) {
      editor.allSelected().each(function(s) {
        editor.showHiddenFeatures(s.findAncestorOrSelf(["ct_element"]));
      });
    }
  },  

  {
    name: "Collapse Element",
    trigger: "collapse_event",
    readOnly: true,
    enable: function(n, editor) {
      return n.hasClassName("ct_element");
    },
    run: function(n, editor) {
      editor.allSelected().each(function(s) {
        editor.collapseElement(s);
      });
    }
  },

  {
    name: "Expand Element",
    trigger: "expand_event",
    readOnly: true,
    enable: function(n, editor) {
      return n.hasClassName("ct_element");
    },
    run: function(n, editor) {
      editor.allSelected().each(function(s) {
        editor.expandElement(s);
      });
    }
  },

  {
    name: "Collapse Element Recursive",
    trigger: "collapse_recursive_event",
    readOnly: true,
    enable: function(n, editor) {
      return n.hasClassName("ct_element");
    },
    run: function(n, editor) {
      editor.allSelected().each(function(s) {
        editor.collapseElementRecursive(s);
      });
    }
  },

  {
    name: "Expand Element Recursive",
    trigger: "expand_recursive_event",
    readOnly: true,
    enable: function(n, editor) {
      return n.hasClassName("ct_element");
    },
    run: function(n, editor) {
      editor.allSelected().each(function(s) {
        editor.expandElementRecursive(s);
      });
    }
  },

  {
    name: "Copy",
    trigger: "copy_event",
    readOnly: true,
    enable: function(n, editor) {
      return !n.hasClassName("ct_empty");
    },
    run: function(n, editor) {
      editor.copyToClipboard(editor.allSelected());
    }
  },

  {
    name: "Cut",
    trigger: "cut_event",
    enable: function(n, editor) {
      return !n.hasClassName("ct_empty");
    },
    run: function(n, editor) {
      editor.copyToClipboard(editor.allSelected());
      if (n.hasClassName("ct_value")) {
        Concrete.Editor.CommandHelper.removeValue(n, editor);
      }
      else {
        editor.removeElements(editor.allSelected());
      }
      editor._setDirtyState();
    }
  },

  {
    name: "Paste",
    trigger: "paste_event",
    enable: function(n, editor) {
      return (n.hasClassName("ct_element") && editor.clipboard.containsElement()) ||
        (n.hasClassName("ct_value") && editor.clipboard.containsValue());
    },
    run: function(n, editor) {
      var data = editor.clipboard.read();
      if (!(data instanceof Array)) data = [ data ];
      if (n.hasClassName("ct_element")) {
        editor.modelInterface.createElement(n, "after", data);
        var created = n.next();
        data.each(function(d) {
          Concrete.Editor.CommandHelper.showAllNonAutoHideFeatures(created, editor);
          created = created.next();
        });
        editor.selector.selectDirect(n.next());
        if (n.hasClassName("ct_empty")) n.remove();
      }
      else {
        editor.modelInterface.createValue(n, "after", data);
        editor.selector.selectDirect(n.next());
        if (n.hasClassName("ct_empty")) n.remove();
      }
      editor.adjustMarker();
      editor._setDirtyState();
    }
  },

  {
    name: "Jump Reference",
    trigger: "jump_forward_event",
    readOnly: true,
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && n.mmFeature().isReference();
    },
    run: function(n, editor) {
      editor.jumpReference(n);
    }
  },

  {
    name: "Jump Reference Back",
    trigger: "jump_backward_event",
    readOnly: true,
    enable: function(n, editor) {
      return true;
    },
    run: function(n, editor) {
      if (editor.jumpStack.size() > 0) {
        editor.selector.selectDirect(editor.jumpStack.pop());
      }
    }
  }

];
