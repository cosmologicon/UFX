#include <iostream>
#include <stdint.h>

// Reference implementation of LCG RNG
// http://en.wikipedia.org/wiki/Linear_congruential_generator#Parameters_in_common_use
uint32_t seed = 14045;
uint32_t rand() {
    return (seed = seed * 1664525u + 1013904223u);
}


// Reference implementation of Jenkins hash
// http://en.wikipedia.org/wiki/Jenkins_hash_function
uint32_t jenkins(std::string key) {
    uint32_t hash, i;
    for(hash = i = 0; i < key.size(); ++i)
    {
        hash += key[i];
        hash += hash << 10;
        hash ^= hash >> 6;
    }
    hash += hash << 3;
    hash ^= hash >> 11;
    hash += hash << 15;
    return hash;
}

int main () {
    // RNG tests. outputs:
    // 2917321368
    // 914607383
    // 2350286730
    // 209368554518
    // 3821795205
    std::cout << rand() << std::endl;
    std::cout << rand() << std::endl;
    std::cout << rand() << std::endl;
    unsigned long long t = 0;
    for (int j = 0 ; j < 100 ; ++j) t += rand();
    std::cout << t << std::endl;
    std::cout << rand() << std::endl;

	// Hash function tests. outputs:
	// 3392050242
	// 4164669301
	// 3893909825
	std::cout << jenkins("a") << std::endl;
	std::cout << jenkins("Hello, world!") << std::endl;
	std::cout << jenkins("[1,2,3,4,5,\"a\"]") << std::endl;
}


