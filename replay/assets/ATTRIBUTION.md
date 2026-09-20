# Cat model

- Title: Cat
- Creator: Quaternius
- Source page: https://poly.pizza/m/qKICY6xla2
- Download: https://static.poly.pizza/67f5e3fe-37ee-4c86-95c8-d269d8c9f8ba.glb
- License: CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/
- Retrieved: 2026-09-20
- File: cat.glb, 238,672 bytes; 2,448 triangles according to source page.
- Original GLB retained. Runtime changes: matte material settings, enlarged head, posed bones, placement on a procedural scooter.
- This is a generic low-poly cat used for a 3D effect trial, not a finished ragdoll cat design.

Three.js is distributed through npm under its MIT license (node_modules/three/LICENSE).

## 拟人化试装
在浏览器运行时调直躯干、放大头部，收起原单骨骼四肢，增加程序生成的衣服、围巾及带肘膝的四肢。骑行握把、停车单脚落地。源 GLB 文件未覆盖；这些修改目前保存在 stage3d.mjs 场景代码中。

## 布偶猫造型迭代
当前舞台使用 replay/ragdoll.mjs 中原创程序几何，不再加载旧 cat.glb。参考蓝双色布偶猫照片的脸型、蓝眼睛、白色倒 V 和重点色，没有复制照片作为纹理。
- 照片参考：https://ffcot.jp/wp-content/uploads/2023/06/S__20660228.jpg
- 品种特征：https://tica.org/breed/ragdoll/
造型为卡通试作，未实现真实毛发；保留拟人坐姿与停行预览。

## 当前角色：Animated Platformer Character
作者：Quaternius。许可：CC0 1.0。
官方素材包：https://quaternius.com/packs/ultimateplatformer.html
模型页：https://poly.pizza/m/kKtL4zvS3n
下载：https://static.poly.pizza/906e29d9-2e15-4c5c-a38a-fb99023acc9c.glb
本地文件：platformer.glb，453384 bytes；保留原网格、纹理和 18 个动画。运行时调整材质粗糙度、整体尺寸，以两段骨骼求解握把和坐姿，不拉伸四肢。原版猫及布偶猫试作已停用。
