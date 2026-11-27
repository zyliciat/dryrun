# dryrun

## Overview

## Design Process
any wireframes or 

FOR each park:
    // BAD: don't run
    IF forecast contains "Thundery"       -> bad
    IF forecast contains "Heavy"          -> bad
    IF rain >= heavy_limit                -> bad
    IF PSI > 100                          -> bad
    IF WBGT >= 33                         -> bad

    // NOT GOOD: think twice
    IF rain > 0                           -> not good
    IF forecast contains "Rain" or "Showers" -> not good
    IF WBGT >= 31                         -> not good
    IF UV >= 8                            -> not good

    // OK: fine to run, minor care needed
    IF PSI > 50                           -> ok
    IF UV >= 6                            -> ok
    IF WBGT >= 30                         -> ok

    status = the WORST level triggered
    IF nothing triggered                  -> good