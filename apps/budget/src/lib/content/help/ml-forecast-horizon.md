---
title: Default Forecast Horizon
description: Set how far ahead predictions extend
related: [settings-ml, ml-features]
---

# Default Forecast Horizon

Set the default number of days for cash flow predictions.

## Range

- **Minimum**: 7 days
- **Maximum**: 365 days
- **Recommended**: 30-90 days

## Accuracy Considerations

Shorter horizons are more accurate:
- **7-30 days**: High confidence
- **30-90 days**: Good confidence
- **90-365 days**: Lower confidence, useful for trends

## Tips

- Start with 30 days for practical budgeting
- Use longer horizons for long-term planning
- You can always adjust per-forecast when viewing predictions
- More historical data improves long-range accuracy
