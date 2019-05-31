import random

for i in range(10):
    dna = ''
    for num in range(random.randrange(10, 20)):
        dna += random.choice('ATCG')
    print(dna)
