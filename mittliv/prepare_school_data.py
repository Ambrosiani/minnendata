import urllib.request, csv, json, time

with open('participating_schools_20220125.csv') as schools_file:
	schools = list(csv.reader(schools_file))

print ('checking', len(schools), 'schools…')

i = 0
for school in schools:
	api_request = 'https://kulturnav.org/api/core/' + school[0] + '?properties=coordinates'
	with urllib.request.urlopen(api_request) as url:
		data = json.loads(url.read().decode())
		try:
			print(school[0] + ',' + data['entities'][0]['name']['sv'] + ',' + data['entities'][0]['coordinates'])
		except KeyError:
			print(school[0] + ',' + data['entities'][0]['name']['sv'] + ',')
	
	time.sleep(0.05)
	i = i+1
