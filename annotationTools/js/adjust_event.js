/** @file This file contains the functions to adjust an existing polygon. */
/**
 * Creates the adjusting event
 * @constructor

 
 * @param {string} dom_attach - The html element where the polygon lives
 * @param {array} x - The x coordinates for the polygon points
 * @param {array} y - The y coordinates for the polygon points
 * @param {string} obj_name - The name of the adjusted_polygon
 * @param {function} ExitFunction - the_function to execute once adjusting is done
 * @param {float} scale - Scaling factor for polygon points
*/
function AdjustEvent(dom_attach,x,y,obj_name,ExitFunction,scale, bounding_box_annot) {

  /****************** Private variables ************************/

  // ID of DOM element to attach to:
  this.bounding_box = bounding_box_annot;

  this.dom_attach = dom_attach;
  this.scale_button_pressed = false;
  // Polygon:
  this.x = x;
  this.y = y;

  // Object name:
  this.obj_name = obj_name;

  // Function to call when event is finished:
  this.ExitFunction = ExitFunction;

  // Scaling factor for polygon points:
  this.scale = scale;

  // Boolean indicating whether a control point has been edited:
  this.editedControlPoints = false;

  // Boolean indicating whether a control point is being edited:
  this.isEditingControlPoint = false;

// Boolean indicating whether a scaling point is being edited:
  this.isEditingScalingPoint = false;

  // Boolean indicating whether the center of mass of the polygon is being 
  // adjusted:
  this.isMovingCenterOfMass = false;

  // Index into which control point has been selected:
  this.selectedControlPoint;

  // Index into which scaling point has been selected:
  this.selectedScalingPoint;

  // Location of center of mass:
  this.center_x;
  this.center_y;

  // Element ids of drawn control points:
  this.control_ids = null;

  this.scalepoints_ids = null;

  // Element id of drawn center point:
  this.center_id = null;

  // ID of drawn polygon:
  this.polygon_id;

  /****************** Public functions ************************/

  /** This function starts the adjusting event: */
  this.StartEvent = function() {
    console.log('LabelMe: Starting adjust event...');
    // Draw polygon:

    this.polygon_id = this.DrawPolygon(this.dom_attach,this.x,this.y,this.obj_name,this.scale);
    select_anno.polygon_id = this.polygon_id;
    FillPolygon(this.polygon_id);
    if (video_mode){
      oVP.ShowTemporalBar();
      oVP.CreateLabeledFramesNavigationButtons();
      $('#myCanvas_bg').css('opacity', 0.5);
    }
    // Set mousedown action to stop adjust event when user clicks on canvas:

    $('#'+this.dom_attach).unbind();
    $('#'+this.dom_attach).mousedown({obj: this},function(e) {
      if (e.which == 1) {
        return e.data.obj.StopAdjustEvent();
      } else if (e.which == 3) {
        return e.data.obj.AddControlPoint(e.originalEvent);
      }
    });

    // Lower opacity of the rest of elements

    // Show control points:
    if (this.bounding_box){
      this.ShowScalingPoints();
      this.ShowCenterOfMass();
      return;

    }
    this.ShowControlPoints();
    // Show center of mass:
    this.ShowCenterOfMass();
    
    /*
    $(window).keydown({obj: this}, function (e){
      if (!e.data.obj.scale_button_pressed && e.keyCode == 17 && !e.data.obj.isEditingControlPoint){
        e.data.obj.RemoveScalingPoints();
        e.data.obj.RemoveControlPoints();
        e.data.obj.RemoveCenterOfMass();
        e.data.obj.ShowScalingPoints();
        e.data.obj.scale_button_pressed = true;
      }
      
    });
    $(window).keyup({obj: this}, function (e){
      if (e.keyCode == 17 && !e.data.obj.isEditingControlPoint){
      e.data.obj.scale_button_pressed = false;
      e.data.obj.RemoveScalingPoints();
      e.data.obj.RemoveControlPoints();
      e.data.obj.RemoveCenterOfMass();
      e.data.obj.ShowControlPoints();
      e.data.obj.ShowCenterOfMass();
      }
    });*/
  };
  
  /** This function stops the adjusting event and calls the ExitFunction: */
  this.StopAdjustEvent = function() {
    // Remove polygon:
    $('#'+this.polygon_id).parent().remove();

    // Remove key press action
    $(window).unbind("keydown");
    $(window).unbind("keyup");
    // and click off canvas action
    $('#select_canvas').unbind("mousedown");
    // Remove control points and center of mass point: 
    this.RemoveControlPoints();
    this.RemoveCenterOfMass();
    this.RemoveScalingPoints();
    console.log('LabelMe: Stopped adjust event.');
    if (video_mode){
      oVP.HideTemporalBar();
      oVP.RemoveLabeledFramesNavigationButtons();
    }
    
    if (video_mode) $('#myCanvas_bg').css('opacity', 1);

    // remove any duplicate points the user accidentally made
    var curr_pt = 0;
    while (curr_pt < this.x.length) {
      var x0 = this.x[curr_pt]
      var y0 = this.y[curr_pt]
      var x1 = this.x[(curr_pt+1)%this.x.length]
      var y1 = this.y[(curr_pt+1)%this.x.length]

      // give the user a centipixel of leeway
      if ((Math.abs(x1-x0) > 1e-2) || (Math.abs(y1-y0) > 1e-2)){
        // the points are not the same. check the next one
        curr_pt += 1;
      } else {
        // the points are the same. remove the current one, as it's the same
        // as the next one.
        this.x.splice(curr_pt, 1);
        this.y.splice(curr_pt, 1);
      }
    }

    // delete selection polygon so we don't get two next time the user selects this annotation
    select_anno.DeletePolygon();

    // Call exit function:

    this.ExitFunction(this.x,this.y,this.editedControlPoints);
  };

  /** This function shows the scaling points for a polygon */
  this.ShowScalingPoints = function (){
    if(!this.scalepoints_ids) this.scalepoints_ids = new Array();
    for (var i = 0; i < this.x.length; i++){
      this.scalepoints_ids.push(DrawPoint(this.dom_attach,this.x[i],this.y[i],'r="5" fill="#0000ff" stroke="#ffffff" stroke-width="2.5"',this.scale));
    }
    for (var i = 0; i < this.scalepoints_ids.length; i++) $('#'+this.scalepoints_ids[i]).mousedown({obj: this,point: i},function(e) {
      if (e.which != 1) return true;
    return e.data.obj.StartMoveScalingPoint(e.data.point);
  });

  }

  /** This function removes the displayed scaling points for a polygon */
  this.RemoveScalingPoints = function (){
    if(this.scalepoints_ids) {
      for(var i = 0; i < this.scalepoints_ids.length; i++) $('#'+this.scalepoints_ids[i]).remove();
      this.scalepoints_ids = null;
    }
  }

  /** This function shows the control points for a polygon */
  this.ShowControlPoints = function() {
    if(!this.control_ids) this.control_ids = new Array();
    for(var i = 0; i < this.x.length; i++) {
      // Draw control point:
      this.control_ids.push(DrawPoint(this.dom_attach,this.x[i],this.y[i],
        'r="5" fill="#00ff00" stroke="#ffffff" stroke-width="2.5" style="cursor:pointer;"',this.scale));
      
      // Set action:
      $('#'+this.control_ids[i]).mousedown({obj: this,point: i},function(e) {
        if (e.which == 1) {
          return e.data.obj.StartMoveControlPoint(e.data.point);
        } else if (e.which == 3) {
          return e.data.obj.DeleteControlPoint(e.data.point);
        }
      });
    }
  };

  /** This function removes the displayed control points for a polygon */
  this.RemoveControlPoints = function() {
    if(this.control_ids) {
      for(var i = 0; i < this.control_ids.length; i++) $('#'+this.control_ids[i]).remove();
      this.control_ids = null;
    }
  };

  /** This function shows the middle grab point for a polygon. */
  this.ShowCenterOfMass = function() {
    var MarkerSize = 8;
    if(this.x.length==1) MarkerSize = 6;
    
    // Get center point for polygon:
    this.CenterOfMass(this.x,this.y);
    
    // Draw center point:
    this.center_id = DrawPoint(this.dom_attach,this.center_x,this.center_y,
      'r="' + MarkerSize + '" fill="red" stroke="#ffffff" stroke-width="' + MarkerSize/2 + '" style="cursor:pointer;"',this.scale);
    
    // Set action:
    $('#'+this.center_id).mousedown({obj: this},function(e) {
      if (e.which != 1) return true;
       return e.data.obj.StartMoveCenterOfMass();
      });
  };

  /** This function removes the middle grab point for a polygon */
  this.RemoveCenterOfMass = function() {
    if(this.center_id) {
      $('#'+this.center_id).remove();
      this.center_id = null;
    }
  };
  

  /** This function is called when one scaling point is clicked
   * It prepares the polygon for scaling.
   * @param {int} i - the index of the scaling point being modified
  */
  this.StartMoveScalingPoint = function(i) {
    if(!this.isEditingScalingPoint) {
      $('#'+this.dom_attach).unbind();
      $('#'+this.dom_attach).mousemove({obj: this},function(e) {
      return e.data.obj.MoveScalingPoint(e.originalEvent, !e.data.obj.bounding_box);
    });
      $('#body').mouseup({obj: this},function(e) {
        return e.data.obj.StopMoveScalingPoint(e.originalEvent);
      });
      this.RemoveCenterOfMass();      
      this.selectedScalingPoint = i;
      this.isEditingScalingPoint = true;
      this.editedControlPoints = true;
    }
  };
  /** This function is called when one scaling point is being moved
   * It computes the position of the scaling point in relation to the polygon's center of mass
   * and resizes the polygon accordingly
   * @param {event} event - Indicates a point is being moved and the index of such point
  */
  this.MoveScalingPoint = function(event, proportion) {
    var x = GetEventPosX(event);
    var y = GetEventPosY(event);
    if(this.isEditingScalingPoint && (this.scale_button_pressed || this.bounding_box)) {
      var origx, origy, pointx, pointy, prx, pry;
      pointx = this.x[this.selectedScalingPoint];
      pointy = this.y[this.selectedScalingPoint];
      this.CenterOfMass(this.x,this.y);
      
      var sx = pointx - this.center_x;
      var sy = pointy - this.center_y;
      if (sx < 0) origx = Math.max.apply(Math, this.x);
      else origx = Math.min.apply(Math, this.x);
      if (sy < 0) origy = Math.max.apply(Math, this.y);
      else origy = Math.min.apply(Math, this.y);
      prx = (Math.round(x/this.scale)-origx)/(pointx-origx);
      pry = (Math.round(y/this.scale)-origy)/(pointy-origy);
      if (proportion) pry = prx;
      if (prx <= 0 || pry  <= 0 ) return;
      for (var i = 0; i < this.x.length; i++){
      // Set point:
        var dx = (this.x[i] - origx)*prx;
        var dy = (this.y[i] - origy)*pry;
        x = origx + dx;
        y = origy + dy;
        this.x[i] = Math.max(Math.min(x,main_media.width_orig),1);
        this.y[i] = Math.max(Math.min(y,main_media.height_orig),1);
      }
      // Remove polygon and redraw:
      $('#'+this.polygon_id).parent().remove();
      //$('#'+this.polygon_id).remove();
      this.polygon_id = this.DrawPolygon(this.dom_attach,this.x,this.y,this.obj_name,this.scale);
      select_anno.polygon_id = this.polygon_id;
      // Adjust control points:

      this.RemoveScalingPoints();
      this.ShowScalingPoints();
    }
  };

  /** This function is called when one scaling point stops being moved
   * It updates the xml with the new coordinates of the polygon.
   * @param {event} event - Indicates a point is being moved and the index of such point
   */
  this.StopMoveScalingPoint = function(event) {
    console.log('Moving scaling point');
    if(this.isEditingScalingPoint) {
      this.MoveScalingPoint(event, !this.bounding_box);
      FillPolygon(this.polygon_id);
      this.isEditingScalingPoint = false;
      if (video_mode) main_media.UpdateObjectPosition(select_anno, this.x, this.y);

      this.ShowCenterOfMass();
      // Set action:
      $('#'+this.dom_attach).unbind();
      $('#'+this.dom_attach).mousedown({obj: this},function(e) {
        if (e.which == 1) {
          return e.data.obj.StopAdjustEvent();
        } else if (e.which == 3) {
          return e.data.obj.AddControlPoint(e.originalEvent);
        }
      });

    }
  };

  /** This function is called when one control point is clicked
   * @param {int} i - the index of the control point being modified
  */  

  this.StartMoveControlPoint = function(i) {
    if(!this.isEditingControlPoint) {
      $('#'+this.dom_attach).unbind();
      $('#'+this.dom_attach).mousemove({obj: this},function(e) {
      return e.data.obj.MoveControlPoint(e.originalEvent);
    });
      $('#body').mouseup({obj: this},function(e) {
        return e.data.obj.StopMoveControlPoint(e.originalEvent);
      });      

      this.RemoveCenterOfMass();
      this.selectedControlPoint = i;
      
      this.isEditingControlPoint = true;
      this.editedControlPoints = true;
    }
  };

  /** This function is called when one control point is being moved
   * @param {event} event - Indicates a point is being moved and the index of such point
  */
  this.MoveControlPoint = function(event) {
    if(this.isEditingControlPoint) {
      var x = GetEventPosX(event);
      var y = GetEventPosY(event);
      
      // Set point:
      this.x[this.selectedControlPoint] = Math.max(Math.min(Math.round(x/this.scale),main_media.width_orig),1);
      this.y[this.selectedControlPoint] = Math.max(Math.min(Math.round(y/this.scale),main_media.height_orig),1);

      this.originalx = this.x;
      this.originaly = this.y;
      
      // Remove polygon and redraw:
      //if ($('#'+this.polygon_id).is('image')) $('#'+this.polygon_id).remove();
      $('#'+this.polygon_id).parent().remove();
      //$('#'+this.polygon_id).remove();
      this.polygon_id = this.DrawPolygon(this.dom_attach,this.x,this.y,this.obj_name,this.scale);
      select_anno.polygon_id = this.polygon_id;
      // Adjust control points:
      this.RemoveControlPoints();
      this.ShowControlPoints();
    }
  };

  /** This function is called when one control point stops being moved
   * It updates the xml with the new coordinates of the polygon.
   * @param {event} event - Indicates a point is being moved and the index of such point
   */
  this.StopMoveControlPoint = function(event) {
    console.log('Moving control point');
    if(this.isEditingControlPoint) {
      this.MoveControlPoint(event);
      FillPolygon(this.polygon_id);
      this.ShowCenterOfMass();
      this.isEditingControlPoint = false;
      if (video_mode) main_media.UpdateObjectPosition(select_anno, this.x, this.y);
      // Set action:
      $('#'+this.dom_attach).unbind();
      $('#'+this.dom_attach).mousedown({obj: this},function(e) {
        if (e.which == 1) {
          return e.data.obj.StopAdjustEvent();
        } else if (e.which == 3) {
          return e.data.obj.AddControlPoint(e.originalEvent);
        }
      });

    }
  };

  this.AddControlPoint = function(event) {
    // where the mouse was right clicked
    var mx = GetEventPosX(event);
    var my = GetEventPosY(event);
    // converted to image coordinates
    mx = Math.max(Math.min(Math.round(mx/this.scale),main_media.width_orig),1);
    my = Math.max(Math.min(Math.round(my/this.scale),main_media.height_orig),1);

    var closest = closest_point_on_poly(mx, my, this.x, this.y);
    var pt_x = closest[0];
    var pt_y = closest[1];
    var seg_dist = closest[2];
    var closest_seg = closest[3];

    // make sure the user is clicking roughly on the line
    if (seg_dist > 5/this.scale) {
      // let another handler do something
      return true;
    }

    // completely throw away the polygon
    $('#'+this.polygon_id).parent().remove();
    this.RemoveControlPoints();
    this.RemoveCenterOfMass();
    // insert the new point
    this.x.splice(closest_seg, 0, pt_x);
    this.y.splice(closest_seg, 0, pt_y);
    // and make the new polygon appear
    this.polygon_id = this.DrawPolygon(this.dom_attach,this.x,this.y,this.obj_name,this.scale);
    select_anno.polygon_id = this.polygon_id;
    this.ShowControlPoints();
    this.ShowCenterOfMass();
    FillPolygon(this.polygon_id);
    this.editedControlPoints = true;
    // don't handle anything further
    return false;
  }

  this.DeleteControlPoint = function(i) {
    // make sure the polygon doesn't denegerate
    if (this.x.length == 3) return false;
    // completely throw away the polygon
    $('#'+this.polygon_id).parent().remove();
    this.RemoveControlPoints();
    this.RemoveCenterOfMass();
    // remove the point in question
    this.x.splice(i, 1);
    this.y.splice(i, 1);
    // then make the new polygon appear
    this.polygon_id = this.DrawPolygon(this.dom_attach,this.x,this.y,this.obj_name,this.scale);
    select_anno.polygon_id = this.polygon_id;
    this.ShowControlPoints();
    this.ShowCenterOfMass();
    FillPolygon(this.polygon_id);
    this.editedControlPoints = true;
    // don't handle anything further
    return false;
  };

  /** This function is called when the middle grab point is clicked
   * It prepares the polygon for moving.
  */
  this.StartMoveCenterOfMass = function() {
    if(!this.isMovingCenterOfMass) {
      $('#'+this.dom_attach).unbind();
      $('#'+this.dom_attach).mousemove({obj: this},function(e) {
        return e.data.obj.MoveCenterOfMass(e.originalEvent);
      });
      $('#body').mouseup({obj: this},function(e) {
        return e.data.obj.StopMoveCenterOfMass(e.originalEvent);
      });
      this.RemoveScalingPoints();
      this.RemoveControlPoints();
      
      this.isMovingCenterOfMass = true;
      this.editedControlPoints = true;
    }
  };

  /** This function is called when the middle grab point is being moved
   * @param {event} event - Indicates the middle grab point is moving
   * It modifies the control points to be consistent with the polygon shift
  */
  this.MoveCenterOfMass = function(event) {
    if(this.isMovingCenterOfMass) {
      var x = GetEventPosX(event);
      var y = GetEventPosY(event);
      
      // Get displacement:
      var dx = Math.round(x/this.scale)-this.center_x;
      var dy = Math.round(y/this.scale)-this.center_y;
      
      // Adjust dx,dy to make sure we don't go outside of the image:
      for(var i = 0; i < this.x.length; i++) {
        dx = Math.max(this.x[i]+dx,1)-this.x[i];
        dy = Math.max(this.y[i]+dy,1)-this.y[i];
        dx = Math.min(this.x[i]+dx,main_media.width_orig)-this.x[i];
        dy = Math.min(this.y[i]+dy,main_media.height_orig)-this.y[i];
      }
      // Adjust polygon and center point:
      for(var i = 0; i < this.x.length; i++) {
        this.x[i] = Math.round(this.x[i]+dx);
        this.y[i] = Math.round(this.y[i]+dy);
      }
      this.center_x = Math.round(this.scale*(dx+this.center_x));
      this.center_y = Math.round(this.scale*(dy+this.center_y));
      
      // Remove polygon and redraw:
      //if ($('#'+this.polygon_id).is('image')) $('#'+this.polygon_id).remove();
      $('#'+this.polygon_id).parent().remove();
      this.polygon_id = this.DrawPolygon(this.dom_attach,this.x,this.y,this.obj_name,this.scale);
      select_anno.polygon_id = this.polygon_id;

      // Redraw center of mass:
      this.RemoveCenterOfMass();
      this.ShowCenterOfMass();
    }
  };


  /** This function is called when the middle grab point stops being moved
   * It updates the xml with the new coordinates of the polygon.
   * @param {event} event - Indicates the middle grab point is being moved and the index of such point
   */
  this.StopMoveCenterOfMass = function(event) {
    if(this.isMovingCenterOfMass) {
      // Move to final position:
      this.MoveCenterOfMass(event);
      
      // Refresh control points:
      if (this.bounding_box){
        this.RemoveScalingPoints();
        this.RemoveCenterOfMass();
        this.ShowScalingPoints();
        this.ShowCenterOfMass();
      }
      else {
        this.RemoveControlPoints();
        this.RemoveCenterOfMass();
        this.ShowControlPoints();
        this.ShowCenterOfMass();
      }

      FillPolygon(this.polygon_id);
      this.isMovingCenterOfMass = false;
      if (video_mode) main_media.UpdateObjectPosition(select_anno, this.x, this.y);
      // Set action:
      $('#'+this.dom_attach).unbind();
      $('#'+this.dom_attach).mousedown({obj: this},function(e) {
        if (e.which == 1) {
          return e.data.obj.StopAdjustEvent();
        } else if (e.which == 3) {
          return e.data.obj.AddControlPoint(e.originalEvent);
        }
      });

    }
  };

  /*************** Helper functions ****************/

  /** Compute center of mass for a polygon given array of points (x,y):

  */
  this.CenterOfMass = function(x,y) {
    var center = compute_center_of_mass(x, y);
    this.center_x = center[0];
    this.center_y = center[1];
  };


  this.DrawPolygon = function(dom_id,x,y,obj_name,scale) {
    if(x.length==1) return DrawFlag(dom_id,x[0],y[0],obj_name,scale);
    
    var attr = 'fill="none" stroke="' + HashObjectColor(obj_name) + '" stroke-width="4"';
    return DrawPolygon(dom_id,x,y,obj_name,attr,scale);
  };
}

function compute_center_of_mass(x, y) {
  var N = x.length;
  
  // Center of mass for a single point:
  if(N==1) {
    return [x[0], y[0]];
  }
  // The center of mass is the average polygon edge midpoint weighted by 
  // edge length:
  var center_x = 0;
  var center_y = 0;
  var perimeter = 0;
  for(var i = 1; i <= N; i++) {
    var length = Math.round(Math.sqrt(Math.pow(x[i-1]-x[i%N], 2) + Math.pow(y[i-1]-y[i%N], 2)));
    center_x += length*Math.round((x[i-1] + x[i%N])/2);
    center_y += length*Math.round((y[i-1] + y[i%N])/2);
    perimeter += length;
  }
  center_x /= perimeter;
  center_y /= perimeter;

  return [center_x, center_y];
}

function closest_point_on_poly(mx, my, poly_x, poly_y) {
  // we want to add the point to the segment that is closest to the mouse.
  // so, we need to find that segment.
  // (thanks Joshua! https://stackoverflow.com/a/6853926)
  var closest_seg = 0;
  var seg_dist = Infinity;
  var pt_x;
  var pt_y;
  for (var pi=0; pi<poly_x.length; pi++) {
    // get the start and end point of this segment
    var sx1 = poly_x[pi];
    var sy1 = poly_y[pi];
    var sx2 = poly_x[(pi+1)%poly_x.length];
    var sy2 = poly_y[(pi+1)%poly_x.length];
    // project the mouse click onto the line segment and calculate
    // projection distance: how far along the line the projected point is
    var A = mx-sx1;
    var B = my-sy1;
    var C = sx2-sx1;
    var D = sy2-sy1;

    var dot = A*C + B*D;
    var len_sq = C*C + D*D;
    var line_pos = -1;
    if (len_sq > 0) line_pos = dot / len_sq;

    var lx, ly;
    if (line_pos <= 0) {
      // can't be before the start of the line
      lx = sx1;
      ly = sy1;
    } else if (line_pos >= 1) {
      // can't be after the end of the line
      lx = sx2;
      ly = sy2;
    } else {
      lx = sx1 + line_pos*C;
      ly = sy1 + line_pos*D;
    }

    var dx = mx-lx;
    var dy = my-ly;
    var dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < seg_dist) {
      // this segment has a point closer to the mouse than any previous
      seg_dist = dist;
      closest_seg = (pi+1)%poly_x.length;
      pt_x = lx;
      pt_y = ly;
    }
  }

  return [pt_x, pt_y, seg_dist, closest_seg];
}
