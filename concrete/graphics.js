// Concrete Model Editor
//
// Copyright (c) 2012 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.Graphics = {
  getConnectorForCanvas: function(canvas) {
    return canvas._concrete_connector;
  },
  // target element is optional
  createConnector: function(canvasContainer, sourceElement, targetElement) {

	var centerPoint = function(e) {
      return {
        x: e.left() + e.getWidth()/2,
        y: e.top() + e.getHeight()/2
      };
    };
    var lineLength = function(p1, p2) {
      return Math.sqrt(Math.pow(Math.abs(p1.x - p2.x), 2) + Math.pow(Math.abs(p1.y - p2.y), 2));
    };
    var isOnLine = function(point, linePoint1, linePoint2) {
      if (linePoint1 && linePoint2 &&
          ((point.x >= linePoint1.x && point.x <= linePoint2.x) ||
           (point.x <= linePoint1.x && point.x >= linePoint2.x)) &&
          ((point.y >= linePoint1.y && point.y <= linePoint2.y) ||
           (point.y <= linePoint1.y && point.y >= linePoint2.y)) &&
          Math.abs(Math.abs(point.y - linePoint1.y) - 
           (Math.abs(point.x - linePoint1.x)*Math.abs(linePoint1.y - linePoint2.y)/Math.abs(linePoint1.x - linePoint2.x))) <= 3) {
        return true;
      }
      return false;
    };
    var elementBoxClipPoint = function(element, innerPoint, outerPoint) {
      var clipHX, clipHY;
      var clipVX, clipVY;
      var clipPointH = null, clipPointV = null;
      clipHX = ( outerPoint.x < innerPoint.x ) ? element.left() : element.right();
      if( Math.abs(clipHX - innerPoint.x) < Math.abs(innerPoint.x - outerPoint.x) ) {
        clipHY = outerPoint.y + ((innerPoint.y - outerPoint.y) * Math.abs(clipHX - outerPoint.x) / Math.abs(innerPoint.x - outerPoint.x));
        clipPointH = { x: clipHX, y: clipHY };
      }
      clipVY = ( outerPoint.y < innerPoint.y ) ? element.top() : element.bottom();
      if( Math.abs(clipVY - innerPoint.y) < Math.abs(innerPoint.y - outerPoint.y) ) {
        clipVX = outerPoint.x + ((innerPoint.x - outerPoint.x) * Math.abs(clipVY - outerPoint.y) / Math.abs(innerPoint.y - outerPoint.y));
        clipPointV = { x: clipVX, y: clipVY };
      }
      if( clipPointH && clipPointV ) {
        if( lineLength(outerPoint, clipPointH) > lineLength(outerPoint, clipPointV) ) {
          return clipPointH;
        }
        return clipPointV;
      }
      return clipPointH || clipPointV;
    };

    /*
     * Updates the canvas to contain an arrow from p1 to p2.
     * The canvas will be just big enough to fit the arrow.
     */
    var drawArrow = function(p1, p2) {
      if( !(p1 && p2) ) {
        return;
      }

      // determine drawing area:
      var offsetX = (p1.x < p2.x ? p1.x : p2.x) - 10;
      var offsetY = (p1.y < p2.y ? p1.y : p2.y) - 10;
      canvas.width = Math.abs(p1.x - p2.x) + 20;
      canvas.height = Math.abs(p1.y - p2.y) + 20;
      canvas.style.left = (offsetX - offsetParentOffset.left) + "px";
      canvas.style.top = (offsetY - offsetParentOffset.top) + "px";

      // actual drawing:
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width-1, canvas.height-1);
      ctx.translate(-offsetX, -offsetY);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.translate(p2.x, p2.y);
      ctx.rotate(Math.atan2((p2.y-p1.y), p2.x-p1.x));
      ctx.moveTo(-8, -6);
      ctx.lineTo(0, 0);
      ctx.lineTo(-8, 6);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 0.7;
      ctx.stroke();
      if( isSelected ) {
        ctx.clearRect(-3, -3, 6, 6);
        ctx.strokeRect(-3, -3, 6, 6);
      }
      canvas.show();
    };

    var startPoint = function() {
      return elementBoxClipPoint(sourceElement, centerPoint(sourceElement), centerPoint(targetElement));
    };

    var endPoint = function() {
      return elementBoxClipPoint(targetElement, centerPoint(targetElement), centerPoint(sourceElement));
    };

    var canvas = null;
    var isSelected = false;
    var offsetParentOffset;  // (is read, but IDE doesn't pick it up)

    var connector = {
      draw: function(target) {
        if (target && target.x) {
          drawArrow(elementBoxClipPoint(sourceElement, centerPoint(sourceElement), target), target);
        }
        else if (target) {
          drawArrow(elementBoxClipPoint(sourceElement, centerPoint(sourceElement), centerPoint(target)), 
            elementBoxClipPoint(target, centerPoint(target), centerPoint(sourceElement)));
        }
        else if (targetElement) {
          drawArrow(startPoint(), endPoint());
        }
      },
      isOnConnector: function(point) {
        return targetElement && isOnLine(point, startPoint(), endPoint());
      },
      isOnDragHandle: function(point) {
        if (targetElement) {
          var p = endPoint();
          return p && Math.abs(p.x - point.x) <= 5 && Math.abs(p.y - point.y) <= 5;
        }
        return false;
      },
      setSelected: function(sel) {
        isSelected = sel;
      },
      isSelected: function() {
        return isSelected;
      },
      setTargetElement: function(target) {
        targetElement = target;
      },
      destroy: function() {
        canvas.parentNode.removeChild(canvas);	// (always initialized to non-null by code below)
      },
      sourceElement: function() {
        return sourceElement;
      },
      targetElement: function() {
        return targetElement;
      }
    };

    if (!sourceElement) {
      throw("no source element");
    }
    canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.display = "none";
    canvasContainer.appendChild(canvas);
    canvas._concrete_connector = connector;
    offsetParentOffset = canvas.getOffsetParent().cumulativeOffset();

    return connector;
  }
};

