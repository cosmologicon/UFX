import sqlite3, json

dbfilename = "/var/data/dump.db"
db = sqlite3.connect(dbfilename)
c = db.cursor()
qstring = "SELECT timestamp, useragent, data FROM dump WHERE project = 'ufxsupport';"
for row in c.execute(qstring).fetchall():
	timestamp, useragent, data = row
	report = json.loads(data)
	version = report["version"]
	if version != 5:
		continue
	if report["testid"] == 96403:
		break
	def ismatch(mname):
		return report["matchtests"][mname]["valid"] and report["matchtests"][mname]["match"]
#	print(ismatch("2d context"), ismatch("webgl context"), ismatch("experimental webgl context"))
	if not ismatch("webgl context"):
		continue
	missing = [testname for testname in report["matchtests"] if not ismatch(testname)]
	if not missing:
		continue
	print(useragent)
	print(missing)

