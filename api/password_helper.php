<?php

function random_bytes_compat($length)
{
    if (function_exists('openssl_random_pseudo_bytes')) {
        $bytes = openssl_random_pseudo_bytes($length);
        if ($bytes !== false) {
            return $bytes;
        }
    }
    $bytes = '';
    for ($i = 0; $i < $length; $i++) {
        $bytes .= chr(mt_rand(0, 255));
    }
    return $bytes;
}

function make_password_hash($password)
{
    $salt = bin2hex(random_bytes_compat(16));
    $hash = hash('sha256', $salt . $password);
    return $salt . ':' . $hash;
}

function verify_password_hash($password, $stored)
{
    if (!$stored || strpos($stored, ':') === false) {
        return false;
    }
    list($salt, $hash) = explode(':', $stored, 2);
    return hash('sha256', $salt . $password) === $hash;
}
