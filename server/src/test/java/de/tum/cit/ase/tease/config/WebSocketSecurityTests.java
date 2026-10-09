package de.tum.cit.ase.tease.config;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WebSocketSecurityTests {

    private static final int HANDSHAKE_REACHED = 400;

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    class Authenticated {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private JwtDecoder jwtDecoder;

        @Test
        void rejectsHandshakeWithoutToken() throws Exception {
            mockMvc.perform(get("/ws")).andExpect(status().isUnauthorized());
        }

        @Test
        void rejectsHandshakeWithInvalidToken() throws Exception {
            when(jwtDecoder.decode(anyString())).thenThrow(new BadJwtException("invalid"));

            mockMvc.perform(get("/ws").queryParam("token", "invalid")).andExpect(status().isUnauthorized());
        }

        @Test
        void ignoresTokenInAuthorizationHeader() throws Exception {
            when(jwtDecoder.decode("valid")).thenReturn(validJwt());

            mockMvc.perform(get("/ws").header("Authorization", "Bearer valid")).andExpect(status().isUnauthorized());
        }

        @Test
        void acceptsHandshakeWithValidTokenQueryParameter() throws Exception {
            when(jwtDecoder.decode("valid")).thenReturn(validJwt());

            mockMvc.perform(get("/ws").queryParam("token", "valid")).andExpect(status().is(HANDSHAKE_REACHED));
        }

        private Jwt validJwt() {
            return Jwt.withTokenValue("valid")
                    .header("alg", "RS256")
                    .subject("lecturer")
                    .expiresAt(Instant.now().plusSeconds(300))
                    .build();
        }
    }

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    @ActiveProfiles("local")
    class Local {

        @Autowired
        private MockMvc mockMvc;

        @Test
        void acceptsHandshakeWithoutToken() throws Exception {
            mockMvc.perform(get("/ws")).andExpect(status().is(HANDSHAKE_REACHED));
        }
    }
}
