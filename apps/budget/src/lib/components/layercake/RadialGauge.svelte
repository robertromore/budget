<script lang="ts">
	import { arc as d3Arc } from 'd3-shape';

	interface Props {
		/** Value between 0 and 1 */
		value: number;
		/** Outer radius of the gauge */
		size?: number;
		/** Thickness of the arc stroke */
		thickness?: number;
		/** Start angle in degrees (default: 0, top/12 o'clock) */
		startAngle?: number;
		/** End angle in degrees (default: 360, full circle) */
		endAngle?: number;
		/** Fill color for the value arc */
		fill?: string;
		/** Fill color for the background arc */
		backgroundFill?: string;
		/** Background opacity */
		backgroundOpacity?: number;
		/** Corner radius for rounded ends */
		cornerRadius?: number;
		/** CSS class for the value arc */
		class?: string;
	}

	let {
		value,
		size = 120,
		thickness = 10,
		startAngle = 0,
		endAngle = 360,
		fill = 'currentColor',
		backgroundFill = 'currentColor',
		backgroundOpacity = 0.2,
		cornerRadius = 0,
		class: className = ''
	}: Props = $props();

	// Convert degrees to radians
	const toRadians = (deg: number) => (deg * Math.PI) / 180;

	// Calculate dimensions (reactive to props)
	const outerRadius = $derived(size / 2);
	const innerRadius = $derived(outerRadius - thickness);

	// Background arc path (full range)
	const backgroundPath = $derived.by(() => {
		const arcGen = d3Arc()
			.innerRadius(innerRadius)
			.outerRadius(outerRadius)
			.cornerRadius(cornerRadius);

		return (
			arcGen({
				startAngle: toRadians(startAngle),
				endAngle: toRadians(endAngle),
				innerRadius,
				outerRadius
			}) ?? ''
		);
	});

	// Value arc path (proportional to value)
	const valuePath = $derived.by(() => {
		const arcGen = d3Arc()
			.innerRadius(innerRadius)
			.outerRadius(outerRadius)
			.cornerRadius(cornerRadius);

		const range = endAngle - startAngle;
		const valueEndAngle = startAngle + range * Math.min(1, Math.max(0, value));

		return (
			arcGen({
				startAngle: toRadians(startAngle),
				endAngle: toRadians(valueEndAngle),
				innerRadius,
				outerRadius
			}) ?? ''
		);
	});
</script>

<g transform="translate({outerRadius}, {outerRadius})">
	<!-- Background arc -->
	<path d={backgroundPath} fill={backgroundFill} opacity={backgroundOpacity} />

	<!-- Value arc -->
	<path d={valuePath} {fill} class="transition-all duration-500 ease-out {className}" />
</g>
