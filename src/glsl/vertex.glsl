attribute vec2 a_position;
void main(){
    gl_Position=vec4(a_position/vec2(400,400),0.,1.);
}