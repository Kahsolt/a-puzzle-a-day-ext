all:
	gcc.exe -Wall solver.c -o solver.exe

clean:
	rm -rf .*log *.o
