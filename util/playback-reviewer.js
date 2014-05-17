// Include this file in your game and call reviewer.init(gamename, version, obj)

var reviewer = {
	init: function (gamename, version, obj) {
		this.gamename = gamename
		this.version = version
		this.playbackargs = obj || {}
		this.playbackargs.sync = true
		this.playbackargs.persistoncomplete = true
		this.addbanner()
		this.buildtable()
		this.setsyncfactor()
		this.think()
	},
	addbanner: function () {
		this.banner = document.createElement("div")
		this.banner.id = "reviewerbanner"
		this.banner.style.width = "100%"
		this.banner.style.background = "#840"
		this.banner.style.font = "16px sans-serif"
		this.banner.style.border = "medium orange outset"
		this.banner.style.textAlign = "center"
		this.banner.innerHTML = (
			"<table id='reviewersessionlist' border='1' style='margin: 5px auto'>" +
			"<thead><tr><th><th>session name<th>time<th>player<th>duration<th># chapters</thead>" +
			"<tbody id='reviewsessions'></tbody></table>" +
			"<div id='reviewcontrols'>" +
			"<p>Chapter: " +
			"<select id='reviewselector' onclick='reviewer.selectchapter()'></select>" +
			"<button onclick='reviewer.prevchapter()'>Prev</button>" +
			"<button onclick='reviewer.thischapter()'>Curr</button>" +
			"<button onclick='reviewer.nextchapter()'>Next</button>" +
			"<p>Time:" +
			"<input id='reviewtimer' style='width:6em ; text-align: center'></input>" +
			"<p>Replay factor: " +
			"<select id='reviewsyncfactor' onclick='reviewer.setsyncfactor()'>" + 
			"<option value=0>pause</option>" +
			"<option value=0.3>0.3x</option>" +
			"<option value=0.5>0.5x</option>" +
			"<option value=0.75>0.75x</option>" +
			"<option value=1 selected>1x</option>" +
			"<option value=1.5>1.5x</option>" +
			"<option value=2>2x</option>" +
			"<option value=3>3x</option>" +
			"<option value=5>5x</option>" +
			"</select>" +
			"</div>"
		)
		document.body.insertBefore(this.banner, document.body.childNodes[0])
		this.reviewcontrols = document.getElementById("reviewcontrols")
		this.reviewcontrols.style.display = "none"
		this.reviewselector = document.getElementById("reviewselector")
		this.reviewtimer = document.getElementById("reviewtimer")
	},
	buildtable: function () {
		var tbody = document.getElementById("reviewsessions")
		var rows = []
		this.getplayback("sessions").forEach(function (session) {
			var loadfunc = "reviewer.loadsession('" + session.sessionname + "')"
			var t = Math.floor(session.sessionduration / 1000), sdur = ""
			if (t > 60) {
				sdur = "" + Math.floor(t/60) + "m"
				t -= 60 * Math.floor(t/60)
			}
			if (t < 10) sdur += "0"
			sdur += "" + t + "s"
			var fields = [
				'<button onclick="' + loadfunc + '">Load</button>',
				session.sessionname,
				(new Date(session.sessiontime)).toString().substr(4,17),
				session.playername,
				sdur,
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
		while (this.reviewselector.length) {
			this.reviewselector.remove(0)
		}
		var nchapters = this.session.chapters.length
		for (var j = 0 ; j < nchapters ; ++j) {
			var chapter = this.session.chapters[j], jchapter = chapter.n, chaptername = chapter.name
			var s = jchapter + "/" + nchapters + (chaptername ? " : " + chaptername : "")
			this.reviewselector.add(new Option(s, j))
		}
		this.reviewcontrols.style.display = "block"
		document.getElementById("reviewersessionlist").style.display = "none"
		this.playback = UFX.Playback(this.session, this.playbackargs)
		this.playback.playall()
	},
	setsyncfactor: function () {
		this.syncfactor = +(document.getElementById("reviewsyncfactor").value)
		this.playbackargs.syncfactor = this.syncfactor
		if (this.playback) {
			this.playback.syncfactor = this.syncfactor
		}
	},
	selectchapter: function () {
		this.loadchapter(this.reviewselector.value)
	},
	prevchapter: function () {
		if (!this.playback) return
		this.loadchapter(Math.max(this.playback.jchapter - 1, 0))
	},
	thischapter: function () {
		if (!this.playback) return
		this.loadchapter(Math.min(Math.max(this.playback.jchapter, 0), this.session.nchapters - 1))
	},
	nextchapter: function () {
		if (!this.playback) return
		this.loadchapter(Math.min(this.playback.jchapter + 1, this.session.nchapters - 1))
	},
	loadchapter: function (jchapter) {
		this.playback.jchapter = jchapter
		this.playback.loadchapter()
		this.playback.playing = true
	},
	think: function () {
		setTimeout(function () { reviewer.think() }, 100)
		function formattime(t) {
			return Math.floor(t) + "." + (Math.floor(t * 10) % 10 + 10).toString().substr(1)
		}
		if (this.session) {
			var r = this.reviewselector
			var selected = r.selectedIndex >= 0 ? r.options[r.selectedIndex].value : null
			if (this.playback.jchapter != selected) {
				for (var j = 0 ; j < r.length ; ++j) {
					if (r.options[j].value == this.playback.jchapter) {
						r.selectedIndex = j
						break
					}
				}
			}
//			this.reviewchapter.value = this.playback.jchapter + "/" + this.session.nchapters
			this.reviewtimer.value = formattime(this.playback.chaptert) + "/" + formattime(this.playback.chapter.duration / 1000)
		}
	},
}

