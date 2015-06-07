// UFX.pointer module
// Abstracts away interface for games that can use either mouse or touch.
// Requires UFX.mouse and UFX.touch
// The only API is UFX.pointer.init and UFX.pointer.state.

// For simplicity, only one action can be taken at a time. If multiple actions start occurring
// simultaneously (eg right mouse button is clicked while left mouse button is being held), then
// we'll just wait until everything is over before reporting events.

// Various kinds of actions are:
//   Single mouse button down + up, with drag in between
//   Single touch down + up, with drag and release
//   Click or tap
//   Double click or double tap
//   Scroll wheel
//   Two-touch actions: pinch, rotate


"use strict"
var UFX = UFX || {}

UFX.pointer = {

	init: function (element, backdrop) {
		UFX.mouse.capture.wheel = true
		UFX.mouse.init(element, backdrop)
		UFX.touch.init(element, backdrop)
	},

	state: function () {
		var mstate = UFX.mouse.state(), tstate = UFX.touch.state()
	},
		

}

