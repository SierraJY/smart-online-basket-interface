package com.sobi.sobi_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.integration.config.EnableIntegration;

@SpringBootApplication
@EnableIntegration
public class SobiBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(SobiBackendApplication.class, args);
	}

}
