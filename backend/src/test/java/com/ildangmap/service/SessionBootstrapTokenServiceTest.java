package com.ildangmap.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SessionBootstrapTokenServiceTest {

  @Test
  void createAndVerifyToken() {
    SessionBootstrapTokenService service = new SessionBootstrapTokenService("test-secret");
    String token = service.createToken(42L);
    assertEquals(42L, service.verifyAndConsume(token));
    assertThrows(IllegalArgumentException.class, () -> service.verifyAndConsume(token));
  }
}
