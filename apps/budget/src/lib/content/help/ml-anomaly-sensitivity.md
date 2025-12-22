---
title: Anomaly Detection Sensitivity
description: Control how strictly anomalies are detected
related: [settings-ml, ml-features]
---

# Anomaly Detection Sensitivity

Controls how aggressive the anomaly detection algorithm is.

## Sensitivity Levels

### Low
Only flags major anomalies that are clearly unusual.
- Fewer alerts
- Higher confidence in flagged items
- May miss subtle anomalies

### Medium (Recommended)
Balanced detection for most use cases.
- Reasonable number of alerts
- Good balance of precision and recall
- Catches most unusual transactions

### High
Flags even minor variations from normal patterns.
- More alerts
- May include false positives
- Best for catching subtle issues

## Tips

- Start with Medium and adjust based on results
- Lower sensitivity if you're getting too many false alerts
- Raise sensitivity if you want stricter monitoring
