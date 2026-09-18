# Shoal Cohesion Tool 

A browser-based tool for manually marking fish positions in still images and calculating shoal cohesion and vertical-position metrics.

## Features

- Load multiple images at once
- Navigate between images
- Calibrate tank height from the image
- Mark one point at the center of each fish
- Calculate shoal cohesion metrics:
  - Inter-fish distance (IFD)
  - IFD standard deviation
  - Nearest-neighbor distance (NND)
  - Furthest-neighbor distance (FND)
  - Convex hull area
  - Convex hull perimeter
  - Mean horizontal IFD and horizontal IFD standard deviation
  - Mean vertical IFD and vertical IFD standard deviation
- Calculate vertical-position metrics:
  - Individual fish height
  - Mean height
  - Mean relative height
- Optionally display:
  - Convex hull
  - Individual fish heights
- Export frame-level and individual-fish results as CSV files
- Copy current frame metrics as CSV or TSV

## How to use

1. Open the tool in a web browser.
2. Enter the researcher, video, tank, frame time, and image code information as needed.
3. Select the measurement unit.
4. Open one or more images or drag and drop them into the image area.
5. Click **Calibrate tank height**.
6. Mark two points along the tank bottom.
7. Mark one point at the water surface.
8. Enter the water-column height. The default value is 20 cm.
9. Click once at the center of each fish.
10. Review the live metrics and individual fish heights.
11. Use **Add to sheet** to append the current frame to the results tables.
12. Export the results when finished.

If the Tank field is empty when calibration starts, the tool will ask for the tank/group ID.

## Display options

### Show convex hull

Displays the convex hull connecting the outermost marked fish.

### Show individual heights

Displays each fish number together with its calculated height above the tank bottom.

When this option is disabled, only the fish number is shown beside each marked point.

## Keyboard shortcuts

- `Z` — undo the last marked fish
- `Shift + A` — clear all marked fish points

## Outputs

### Frame-level results

The frame-level CSV includes:

- Researcher
- Video
- Tank
- Frame
- IFD
- IFD SD
- NND
- FND
- Hull area
- Hull perimeter
- Fish count
- Tank height
- Mean height
- Mean relative height
- Mean horizontal IFD
- Horizontal IFD SD
- Mean vertical IFD
- Vertical IFD SD
- Units
- Image code
- Filename

### Individual-fish results

The individual-fish CSV includes:

- Researcher
- Video
- Tank
- Frame
- Image code
- Fish number
- Height
- Relative height
- Units
- Filename

## Metric definitions

- **IFD:** mean pairwise Euclidean distance between all fish, `c = sqrt(a² + b²)`.
- **IFD SD:** standard deviation of all pairwise IFD values.
- **NND:** mean distance from each fish to its nearest neighbor.
- **FND:** mean distance from each fish to its furthest neighbor.
- **Hull area:** area of the convex polygon enclosing the outermost fish.
- **Hull perimeter:** perimeter of that convex polygon.
- **Mean height:** mean perpendicular height of the fish above the calibrated tank bottom.
- **Mean horizontal IFD:** mean absolute pairwise horizontal component (`a`), parallel to the tank bottom.
- **Horizontal IFD SD:** standard deviation of all pairwise horizontal components.
- **Mean vertical IFD:** mean absolute pairwise vertical component (`b`), perpendicular to the tank bottom.
- **Vertical IFD SD:** standard deviation of all pairwise vertical components.

## Citation

If you use this tool in research, please cite the associated protocol and archived version of the code.

Protocols.io: citation and link to be added.

Zenodo: citation and DOI to be added.

## License

Copyright © 2025 Matheus Gallas-Lopes.

Licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0).

See `licence.txt` for details.
