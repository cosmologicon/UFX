// Include this file in your game and call reviewer.init(gamename, version)

var reviewer = {
	init: function (gamename, version, scene) {
		this.gamename = gamename
		this.version = version
		this.scene = scene
		this.addbanner()
		this.buildtable()
	},
	addbanner: function () {
		this.banner = document.createElement("div")
		this.banner.id = "reviewerbanner"
		this.banner.style.width = "100%"
		this.banner.style.background = "#840"
		this.banner.style.font = "16px sans-serif"
		this.banner.innerHTML = (
			"<table id='reviewersessionlist'>" +
			"<thead><tr><th><th>session name<th>time<th>player<th>duration<th># chapters</thead>" +
			"<tbody id='reviewsessions'></tbody></table>"
		)
		document.body.insertBefore(this.banner, document.body.childNodes[0])
	},
	buildtable: function () {
		var tbody = document.getElementById("reviewsessions")
		var rows = []
		this.getplayback("sessions").forEach(function (session) {
			var loadfunc = "reviewer.loadsession('" + session.sessionname + "')"
			var fields = [
				'<button onclick="' + loadfunc + '">Load</button>',
				session.sessionname,
				(new Date(session.sessiontime)).toString(),
				session.playername,
				"" + Math.floor(session.sessionduration / 1000) + "sec",
				"" + session.nchapters
			]
			rows.push("<tr><td>" + fields.join("<td>"))
		})
		tbody.innerHTML = rows.join("\n")
	},
	getplayback: function (get, qobj) {
		var url = "http://universefactory.net/tools/playback/get/"
		qobj = qobj || {}
		var qstring = [
			"get=" + get,
			"gamename=" + (qobj.gamename || this.gamename),
			"gameversion=" + (qobj.version || this.version),
		]
		for (var a in qobj) {
			qstring.push(a + "=" + encodeURIComponent(qobj[a]))
		}
		var req = new XMLHttpRequest()
		req.open("GET", url + "?" + qstring.join("&"), false)
		req.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
		req.send()
//		console.log(req.responseText)
		return JSON.parse(req.responseText)
	},
	loadsession: function (sessionname) {
		this.sessionname = sessionname
		this.session = this.getplayback("session", { sessionname: sessionname })
		this.playback = UFX.Playback(this.session, {
			scene: this.scene,
			sync: true,
		})
		this.playback.playall()
	},
}

