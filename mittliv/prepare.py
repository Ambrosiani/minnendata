import urllib.request, csv, json, time

with open('schools.csv') as schools_file:
	schools = list(csv.reader(schools_file))

print ('checking', len(schools), 'schools…')

i = 0
for school in schools:
	api_request = 'https://api.minnen.se/api/responses/?limit=0&school=' + school[0]
	print(i,'…')
	with urllib.request.urlopen(api_request) as url:
		data = json.loads(url.read().decode())
	if data['total_count'] > 0:
		print(school[0], data['total_count'])
	time.sleep(0.1)
	i = i+1
