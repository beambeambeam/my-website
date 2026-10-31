# The grid draws every grid line

Blocks on the home page never draw their own borders. The row grid draws every grid line exactly once, as the 1px gaps between cells on a border-colored background. Before this, blocks and the page each drew borders, and negative margins and background patches hid the overlap. At half-pixel offsets the hidden line showed through as a doubled or broken line. Gaps cannot overlap, so this bug cannot come back. As a result, the pixel reveal sweeps only block content and no longer traces the lines.
