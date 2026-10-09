package de.tum.cit.ase.tease;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "KEYCLOAK_JWT_URI=http://localhost/certs")
class TeaseApplicationTests {

	@Test
	void contextLoads() {
	}

}
