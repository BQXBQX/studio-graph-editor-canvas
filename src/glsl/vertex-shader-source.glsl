attribute vec2 a_position;
uniform vec2 u_resolution;
void main(){
    vec2 zeroToOne=a_position/u_resolution;
    vec2 zeroToTwo=zeroToOne*2.;
    vec2 clipSpace=zeroToTwo-1.;
    
    // 设置最终顶点位置
    gl_Position=vec4(clipSpace*vec2(1,-1),0,1);
}