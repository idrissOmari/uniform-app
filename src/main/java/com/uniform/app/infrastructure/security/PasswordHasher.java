package com.uniform.app.infrastructure.security;

import jakarta.enterprise.context.ApplicationScoped;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

@ApplicationScoped
public class PasswordHasher {

    private static final String PREFIX = "{sha256}";
    private static final String NOOP_PREFIX = "{noop}";
    private final SecureRandom secureRandom = new SecureRandom();

    public String hash(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("Password must not be blank");
        }
        byte[] saltBytes = new byte[16];
        secureRandom.nextBytes(saltBytes);
        String saltHex = HexFormat.of().formatHex(saltBytes);
        String digestHex = sha256Hex(saltHex + ":" + rawPassword);
        return PREFIX + saltHex + "$" + digestHex;
    }

    public boolean matches(String rawPassword, String storedHash) {
        if (rawPassword == null || storedHash == null || storedHash.isBlank()) {
            return false;
        }
        if (storedHash.startsWith(NOOP_PREFIX)) {
            String expected = storedHash.substring(NOOP_PREFIX.length());
            return MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    rawPassword.getBytes(StandardCharsets.UTF_8)
            );
        }
        if (storedHash.startsWith(PREFIX)) {
            String payload = storedHash.substring(PREFIX.length());
            int separatorIndex = payload.indexOf('$');
            if (separatorIndex <= 0) {
                return false;
            }
            String saltHex = payload.substring(0, separatorIndex);
            String expectedDigestHex = payload.substring(separatorIndex + 1);
            String actualDigestHex = sha256Hex(saltHex + ":" + rawPassword);
            return MessageDigest.isEqual(
                    expectedDigestHex.getBytes(StandardCharsets.UTF_8),
                    actualDigestHex.getBytes(StandardCharsets.UTF_8)
            );
        }
        return false;
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
