import random

for i in range(10):
    rna = ''
    for num in range(random.randrange(10, 20)):
        rna += random.choice('AUCG')
    print(rna)
